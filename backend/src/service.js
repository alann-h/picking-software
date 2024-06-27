import OAuthClient from 'intuit-oauth';
import dotenv from 'dotenv';
import excelToJson from 'convert-excel-to-json';
import fs from 'fs-extra';
import { InputError, AccessError, NotFoundError, AuthenticationError } from './error';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: 'config.env' });

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const databasePath = './database.json';

/***************************************************************
                      Auth Functions
***************************************************************/

function initializeOAuthClient () {
  return new OAuthClient({
    clientId,
    clientSecret,
    environment: 'sandbox',
    redirectUri
  });
}

export function getAuthUri () {
  const oauthClient = initializeOAuthClient();
  const authUri = oauthClient.authorizeUri({ scope: [OAuthClient.scopes.Accounting], state: 'intuit-test' });

  return Promise.resolve(authUri);
}

function getBaseURL (oauthClient) {
  return oauthClient.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production;
}

function getCompanyId (oauthClient) {
  return oauthClient.getToken().realmId;
}

export async function handleCallback (url) {
  const oauthClient = initializeOAuthClient();
  try {
    const authResponse = await oauthClient.createToken(url);
    const token = authResponse.getToken();
    const userId = uuidv4();

    saveUser(userId, token);
    return userId;
  } catch (e) {
    console.error(e);
    throw new AccessError('Could not create token.');
  }
}

function saveUser (userId, token) {
  const database = readDatabase(databasePath);
  database.users[userId] = token;
  writeDatabase(databasePath, database);
}

async function getOAuthClient (userId) {
  if (!userId) {
    return null;
  }
  try {
    const userToken = await getUserToken(userId);
    if (userToken) {
      const oauthClient = initializeOAuthClient();
      oauthClient.setToken(userToken);
      return oauthClient;
    }
  } catch (e) {
    throw new AccessError('Error getting OAuth client: ' + e.message);
  }
  return null;
}

export async function getUserToken (userId) {
  if (!userId) {
    throw new InputError('User Id is not valid');
  }

  const database = readDatabase(databasePath);
  const userToken = database.users[userId];
  if (!userToken) {
    throw new NotFoundError('User not found');
  }

  if (!userToken.access_token || !userToken.refresh_token) {
    throw new AccessError('Token not found for user');
  }

  const oauthClient = initializeOAuthClient();
  oauthClient.setToken(userToken);

  if (oauthClient.isAccessTokenValid()) {
    return userToken;
  }

  if (!oauthClient.token.isRefreshTokenValid()) {
    deleteUserToken(userId);
    throw new AuthenticationError('The Refresh token is invalid, please reauthenticate.');
  }

  try {
    const response = await oauthClient.refreshUsingToken(userToken.refresh_token);
    const newToken = response.getToken();
    saveUser(userId, newToken);
    return newToken;
  } catch (e) {
    throw new NotFoundError('Failed to refresh token');
  }
}

function deleteUserToken (userId) {
  const database = readDatabase(databasePath);
  delete database.users[userId];
  writeDatabase(databasePath, database);
}

export async function getCustomerId (customerName) {
  try {
    const database = readDatabase(databasePath);
    const customerId = database.customers[customerName].id;
    if (!customerId) {
      throw new InputError('This customer does not exist within the database');
    }
    return customerId;
  } catch (error) {
    throw new InputError(error.message);
  }
}

/***************************************************************
                       Quote Functions
***************************************************************/

export async function getCustomerQuotes (customerId, userId) {
  try {
    const oauthClient = await getOAuthClient(userId);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialized');
    }
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);

    const query = `SELECT * from estimate WHERE CustomerRef='${customerId}'`;
    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69`
    });

    const responseJSON = JSON.parse(response.text());
    const filteredEstimates = responseJSON.QueryResponse.Estimate.filter(estimate => estimate.TxnStatus !== 'Closed');
    return filteredEstimates;
  } catch {
    throw new InputError('This quote does not exist');
  }
}

export async function getFilteredEstimates (quoteId, userId) {
  try {
    const oauthClient = await getOAuthClient(userId);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialized');
    }

    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    const query = `SELECT * FROM estimate WHERE Id = '${quoteId}'`;

    const estimateResponse = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69`
    });

    const responseData = JSON.parse(estimateResponse.text());
    const filteredEstimates = await filterEstimates(responseData, oauthClient);
    return filteredEstimates;
  } catch (e) {
    throw new InputError('Quote Id does not exist: ' + e.message);
  }
}

async function filterEstimates (responseData, oauthClient) {
  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.map(async (estimate) => {
    const productObjects = await Promise.all(estimate.Line.map(async (line) => {
      if (line.DetailType === 'SubTotalLineDetail') {
        return null;
      }

      const Description = line.Description;
      const itemRef = line.SalesItemLineDetail && line.SalesItemLineDetail.ItemRef;
      const itemValue = itemRef.value;

      const itemSKU = await getSKUFromId(itemValue, oauthClient);
      return {
        [Description]: {
          SKU: itemSKU,
          pickingQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
          originalQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty
        }
      };
    }));

    const productInfo = productObjects.reduce((acc, productObj) => ({ ...acc, ...productObj }), {});
    const customerRef = estimate.CustomerRef;
    return {
      quoteNumber: estimate.Id,
      customer: customerRef.name,
      productInfo,
      totalAmount: '$' + estimate.TotalAmt
    };
  });

  return Promise.all(filteredEstimatesPromises);
}

async function getSKUFromId(itemValue, oauthClient) {
  try {
    const query = `SELECT * from Item WHERE Id = '${itemValue}'`;
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    const url = `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69`;

    const response = await oauthClient.makeApiCall({ url });
    const responseData = JSON.parse(response.text());

    if (responseData.QueryResponse && responseData.QueryResponse.Item && responseData.QueryResponse.Item.length > 0) {
      return responseData.QueryResponse.Item[0].Sku;
    } else {
      return null;
    }
  } catch (e) {
    throw e;
  }
}

export async function fetchCustomers (userId) {
  try {
    const oauthClient = await getOAuthClient(userId);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialized');
    }
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);

    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=select * from Customer&minorversion=69`
    });
    const responseData = JSON.parse(response.text());
    const customers = responseData.QueryResponse.Customer.map(customer => ({
      id: customer.Id,
      name: customer.DisplayName
    }));
    return customers;
  } catch (e) {
    throw new AccessError('UserId is invalid: ' + e.message);
  }
}

export async function saveCustomers (customers) {
  try {
    const database = readDatabase(databasePath);
    const customerObject = customers.reduce((obj, customer) => {
      obj[customer.name] = { id: customer.id };
      return obj;
    }, {});
    database.customers = customerObject;
    writeDatabase(databasePath, database);
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function processFile (filePath) {
  try {
    const excelData = excelToJson({
      sourceFile: filePath,
      header: { rows: 1 },
      columnToKey: { '*': '{{columnHeader}}' }
    });

    const database = readDatabase(databasePath);
    database.products = {}; // Initialize as an empty object

    for (const key in excelData) {
      if (Object.prototype.hasOwnProperty.call(excelData, key)) {
        const products = excelData[key];
        products.forEach(product => {
          const productInfo = {
            name: product.Name
          };
          database.products[product.Barcode] = productInfo;
        });
      }
    }

    writeDatabase(databasePath, database);

    await fs.remove(filePath);
    return 'Products uploaded successfully';
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function estimateToDB (estimate) {
  try {
    const quote = estimate.quote;
    const estimateInfo = {
      customer: quote.customer,
      productInfo: quote.productInfo,
      totalAmount: quote.totalAmount
    };
    const database = readDatabase(databasePath);
    database.quotes[quote.quoteNumber] = estimateInfo;
    writeDatabase(databasePath, database);
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export function estimateExists (quoteId) {
  const database = readDatabase(databasePath);
  return database.quotes[quoteId] || null;
}

export async function processBarcode (barcode, quoteId, newQty) {
  try {
    const productName = await getProductName(barcode);
    const database = readDatabase(databasePath);
    const estimate = database.quotes[quoteId];

    if (estimate && estimate.productInfo[productName]) {
      let qty = estimate.productInfo[productName].pickingQty;
      if (qty === 0 || (qty - newQty) < 0) {
        return { productName, updatedQty: 0 };
      }
      qty -= newQty;
      estimate.productInfo[productName].pickingQty = qty;
      writeDatabase(databasePath, database);
      return { productName, updatedQty: qty };
    } else {
      throw new InputError('Quote number is invalid or scanned product does not exist on quote');
    }
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function getProductName (barcode) {
  try {
    const database = readDatabase(databasePath);
    const productName = database.products[barcode].name;
    if (!productName) {
      throw new InputError('This product does not exist within the database');
    }
    return productName;
  } catch (error) {
    throw new AccessError(error.message);
  }
}

function readDatabase (databasePath) {
  try {
    const data = fs.readFileSync(databasePath, 'utf8');
    return JSON.parse(data);
  } catch {
    throw new AccessError('Cannot access database');
  }
}

function writeDatabase (databasePath, data) {
  try {
    fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
  } catch {
    throw new AccessError('Cannot write to database');
  }
}
