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

export function handleCallback (url) {
  const oauthClient = initializeOAuthClient();

  return oauthClient.createToken(url)
    .then(function (authResponse) {
      const token = authResponse.getToken();
      const userId = uuidv4();

      saveUser(userId, token);
      return userId;
    })
    .catch(function (e) {
      console.error(e);
      return new AccessError('Could not create token.');
    });
}

function saveUser (userId, token) {
  const database = readDatabase(databasePath);
  database.users[userId] = token;
  writeDatabase(databasePath, database);
}

async function getOAuthClient (userId) {
  if (userId) {
    try {
      const userToken = await getUserToken(userId);
      if (userToken) {
        const oauthClient = initializeOAuthClient();
        oauthClient.setToken(userToken);
        return oauthClient;
      }
    } catch (e) {
      return new AccessError('Error getting OAuth client: ' + e.message);
    }
  }
  return null;
}

export function getUserToken (userId) {
  return new Promise((resolve, reject) => {
    if (!userId) {
      return reject(new InputError('User Id is not valid'));
    }

    const database = readDatabase(databasePath);
    const userToken = database.users[userId];
    if (!userToken) {
      return reject(new NotFoundError('User not found'));
    }

    if (!userToken.access_token || !userToken.refresh_token) {
      return reject(new AccessError('Token not found for user'));
    }

    const oauthClient = initializeOAuthClient();
    oauthClient.setToken(userToken);

    if (oauthClient.isAccessTokenValid()) {
      return resolve(userToken);
    }

    if (!oauthClient.token.isRefreshTokenValid()) {
      deleteUserToken(userId);
      return reject(new AuthenticationError('The Refresh token is invalid, please reauthenticate.'));
    }

    oauthClient.refreshUsingToken(userToken.refresh_token)
      .then(response => {
        const newToken = response.getToken();
        saveUser(userId, newToken);
        resolve(newToken);
      })
      .catch(() => {
        reject(new NotFoundError('Failed to refresh token'));
      });
  });
}

function deleteUserToken (userId) {
  const database = readDatabase(databasePath);
  delete database.users[userId];
  writeDatabase(databasePath, database);
}

export function getCustomerId (customerName) {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase(databasePath);
      const customerId = database.customers[customerName].id;
      if (customerId === null) {
        reject(new InputError('This customer does not exist within the database'));
      } else {
        resolve(customerId);
      }
    } catch (error) {
      reject(new InputError(error));
    }
  });
}

/***************************************************************
                       Quote Functions
***************************************************************/
// gets specific customer quotes that are not closed (might add time period as to not recieve and filter orders from years ago)
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
    const filteredEstimates = filterEstimates(responseData, oauthClient);
    return filteredEstimates;
  } catch (e) {
    throw new InputError('Quote Id does not exist: ' + e.message);
  }
}

function filterEstimates (responseData, oauthClient) {
  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.map(function (estimate) {
    return new Promise((resolve) => {
      Promise.all(estimate.Line.map(function (line) {
        if (line.DetailType === 'SubTotalLineDetail') {
          return Promise.resolve(null);
        }

        const Description = line.Description;
        const itemRef = line.SalesItemLineDetail && line.SalesItemLineDetail.ItemRef;
        const itemValue = itemRef.value;

        return getSKUFromId(itemValue, oauthClient).then(itemSKU => {
          return {
            [Description]: {
              SKU: itemSKU,
              pickingQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
              originalQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty
            }
          };
        });
      })).then(productObjects => {
        // Merge all product objects into a single object
        const productInfo = productObjects.reduce((acc, productObj) => {
          return { ...acc, ...productObj };
        }, {});
        const customerRef = estimate.CustomerRef;
        resolve({
          quoteNumber: estimate.Id,
          customer: customerRef.name,
          productInfo,
          totalAmount: '$' + estimate.TotalAmt
        });
      });
    });
  });

  return Promise.all(filteredEstimatesPromises);
}

function getSKUFromId (itemValue, oauthClient) {
  const query = `SELECT * from Item WHERE Id = '${itemValue}'`;
  const companyID = getCompanyId(oauthClient);
  const baseURL = getBaseURL(oauthClient);

  return new Promise((resolve, reject) => {
    oauthClient.makeApiCall({ url: `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69` })
      .then(function (response) {
        const responseData = JSON.parse(response.text());
        if (responseData.QueryResponse && responseData.QueryResponse.Item && responseData.QueryResponse.Item.length > 0) {
          resolve(responseData.QueryResponse.Item[0].Sku);
        } else {
          resolve(null);
        }
      })
      .catch(e => {
        console.error(e);
        reject(e);
      });
  });
}
// Gather all customers
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

export function saveCustomers (customers) {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase(databasePath);
      const customerObject = customers.reduce((obj, customer) => {
        obj[customer.name] = { id: customer.id };
        return obj;
      }, {});
      database.customers = customerObject;
      writeDatabase(databasePath, database);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function processFile (filePath) {
  return new Promise((resolve, reject) => {
    try {
      const excelData = excelToJson({
        sourceFile: filePath,
        header: { rows: 1 },
        columnToKey: { '*': '{{columnHeader}}' }
      });

      const database = readDatabase(databasePath);
      // clears db in order to ensure the list is correct (theres probably a better way to avoid duplicates and find removed items)
      // but since my db isnt too big it is okay
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

      fs.remove(filePath, err => {
        if (err) {
          reject(err);
        } else {
          resolve('Products uploaded successfully');
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function estimateToDB (estimate) {
  return new Promise((resolve, reject) => {
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
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// checks if estimate exists in database if it is return it or else return null
export function estimateExists (quoteId) {
  const database = readDatabase(databasePath);
  if (database.quotes[quoteId]) {
    return database.quotes[quoteId];
  }
  return null;
}

export function processBarcode (barcode, quoteId, newQty) {
  return new Promise((resolve, reject) => {
    getProductName(barcode)
      .then(productName => {
        const database = readDatabase(databasePath);
        const estimate = database.quotes[quoteId];

        if (estimate && estimate.productInfo[productName]) {
          let qty = estimate.productInfo[productName].pickingQty;
          if (qty === 0 || (qty - newQty) < 0) {
            return resolve({ productName, updatedQty: 0 });
          }
          qty -= newQty;
          estimate.productInfo[productName].pickingQty = qty;
          writeDatabase(databasePath, database);
          resolve({ productName, updatedQty: qty });
        } else {
          reject(new InputError('Quote number is invalid or scanned product does not exist on quote'));
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

export function getProductName (barcode) {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase(databasePath);
      const productName = database.products[barcode].name;
      if (productName === null) {
        reject(new InputError('This product does not exist within the database'));
      } else {
        resolve(productName);
      }
    } catch (error) {
      reject(new InputError(error));
    }
  });
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
