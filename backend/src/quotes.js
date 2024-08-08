import { AccessError, InputError } from './error';
import { query, transaction } from './helpers.js';
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

    const queryStr = `SELECT * from estimate WHERE CustomerRef='${customerId}'`;
    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=${queryStr}&minorversion=69`
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
    const queryStr = `SELECT * FROM estimate WHERE Id = '${quoteId}'`;

    const estimateResponse = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=${queryStr}&minorversion=69`
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
      return {
        productName: Description,
        productId: item.id,
        sku: item.sku,
        pickingQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
        originalQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
        pickingStatus: 'pending',
      };
    }));

    const quoteItems = productObjects.filter(item => item !== null);
    const customerRef = estimate.CustomerRef;
    return {
      quoteId: estimate.Id,
      customerId: customerRef.value,
      customerName: customerRef.name,
      quoteItems,
      totalAmount: parseFloat(estimate.TotalAmt),
      orderStatus: 'pending',
    };
  });

  return Promise.all(filteredEstimatesPromises);
}

export async function estimateToDB(estimate) {
  try {
    const quote = estimate.quote;
    await transaction(async (client) => {
      // Insert into quotes table
      await client.query(
        'INSERT INTO quotes (quoteid, customerid, totalamount, customername) VALUES ($1, $2, $3, $4)',
        [quote.quoteId, quote.customerId, quote.totalAmount, quote.customerName]
      );

      // Insert into quoteitems table
      for (const item of quote.quoteItems) {
        await client.query(
          'INSERT INTO quoteitems (quoteid, productid, productname, pickingqty, originalqty, pickingstatus) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (quoteid, productid) DO UPDATE SET productname = $3, pickingqty = $4, originalqty = $5, pickingstatus = $6',
          [quote.quoteId, item.productId, item.productName, item.pickingQty, item.originalQty, item.pickingStatus]
        );
      }
    });
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export function estimateExists(quoteId) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await query('SELECT * FROM quotes WHERE quoteid = $1', [quoteId]);
      resolve(result.length > 0 ? result[0] : null);
    } catch (error) {
      reject(error);
    }
  });
}

export async function processBarcode(barcode, quoteId, newQty) {
  try {
    const product = await getProductName(barcode);
    if (!product) {
      throw new InputError('Product not found for this barcode');
    }
    const result = await query(
      'UPDATE quoteitems SET pickingqty = GREATEST(pickingqty - $1, 0), pickingstatus = CASE WHEN pickingqty - $1 <= 0 THEN \'completed\' ELSE pickingstatus END WHERE quoteid = $2 AND productid = $3 RETURNING pickingqty, productname',
      [newQty, quoteId, product.productid]
    );
    if (result.length === 0) {
      throw new InputError('Quote number is invalid or scanned product does not exist on quote');
    }
    return { productName: result[0].productname, updatedQty: result[0].pickingqty };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function addProductToQuote(productName, quoteId, qty) {
  try {
    const product = await query('SELECT * FROM products WHERE productname = $1', [productName]);
    if (product.length === 0) {
      throw new AccessError('Product does not exist in database!');
    }
    const quote = await query('SELECT * FROM quotes WHERE quoteid = $1', [quoteId]);
    if (quote.length === 0) {
      throw new AccessError('Quote does not exist in database!');
    }
    
    await transaction(async (client) => {
      await client.query(
        'INSERT INTO quoteitems (quoteid, productid, productname, pickingqty, originalqty, pickingstatus) VALUES ($1, $2, $3, $4, $4, $5) ON CONFLICT (quoteid, productid) DO UPDATE SET pickingqty = quoteitems.pickingqty + $4, originalqty = quoteitems.originalqty + $4',
        [quoteId, product[0].productid, productName, qty, 'pending']
      );
      
      const price = product[0].price * qty;
      await client.query('UPDATE quotes SET totalamount = totalamount + $1 WHERE quoteid = $2', [price, quoteId]);
    });
  } catch (e) {
    throw new AccessError(e.message);
  }
}

export async function adjustProductQuantity(quoteId, productId, newQty) {
  try {
    const result = await query(
      'UPDATE quoteitems SET pickingqty = $1, originalqty = $1 WHERE quoteid = $2 AND productid = $3 RETURNING *',
      [newQty, quoteId, productId]
    );
    if (result.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    return { success: true, message: 'Product quantity adjusted successfully' };
  } catch (error) {
    throw new AccessError(error.message);
  }
}
