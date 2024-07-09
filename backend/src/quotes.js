import { AccessError, InputError } from './error';
import { readDatabase, writeDatabase } from './helpers';
import { getOAuthClient, getBaseURL, getCompanyId } from './auth';
import { getProductFromQB, getProductName } from './products';

export async function getCustomerQuotes(customerId, userId) {
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

export async function getFilteredEstimates(quoteId, userId) {
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

async function filterEstimates(responseData, oauthClient) {
  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.map(async (estimate) => {
    const productObjects = await Promise.all(estimate.Line.map(async (line) => {
      if (line.DetailType === 'SubTotalLineDetail') {
        return null;
      }

      const Description = line.Description;
      const itemRef = line.SalesItemLineDetail && line.SalesItemLineDetail.ItemRef;
      const itemValue = itemRef.value;

      const item = await getProductFromQB(itemValue, oauthClient);
      const itemSKU = item.sku;
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

export async function estimateToDB(estimate) {
  try {
    const quote = estimate.quote;
    const estimateInfo = {
      customer: quote.customer,
      productInfo: quote.productInfo,
      totalAmount: quote.totalAmount
    };
    const database = readDatabase();
    database.quotes[quote.quoteNumber] = estimateInfo;
    writeDatabase(database);
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export function estimateExists(quoteId) {
  const database = readDatabase();
  return database.quotes[quoteId] || null;
}

export async function processBarcode(barcode, quoteId, newQty) {
  try {
    const productName = await getProductName(barcode);
    const database = readDatabase();
    const quote = database.quotes[quoteId];

    if (quote && quote.productInfo[productName]) {
      let qty = quote.productInfo[productName].pickingQty;
      if (qty === 0 || (qty - newQty) < 0) {
        return { productName, updatedQty: 0 };
      }
      qty -= newQty;
      quote.productInfo[productName].pickingQty = qty;
      writeDatabase(database);
      return { productName, updatedQty: qty };
    } else {
      throw new InputError('Quote number is invalid or scanned product does not exist on quote');
    }
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export function addProductToQuote(productName, qty, quoteId) {
  try {
    const database = readDatabase();
    if (!database.products[productName]) {
      throw new AccessError('Product does not exisit in database!');
    }
    if (!database.quotes[quoteId]) {
      throw new AccessError('Quote does not exisit in database!');
    }
    const quote = database.quotes[quoteId];
    quote.productInfo[productName].pickingQty += qty;
    quote.productInfo[productName].originalQty += qty;

    writeDatabase(quote);
  } catch (e) {
    throw new AccessError(error.message);
  }
}

export function removeProduct(productName, quoteId) {
  try {
    const database = readDatabase();
    if (!database.products[productName]) {
      throw new AccessError('Product does not exisit in database!');
    }
    if (!database.quotes[quoteId]) {
      throw new AccessError('Quote does not exisit in database!');
    }
    const quote = database.quotes[quoteId];
    delete quote.productInfo[productName]

    writeDatabase(quote);
  } catch (e) {
    throw new AccessError(error.message);
  }
}