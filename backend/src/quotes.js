import { AccessError, InputError } from './error';
import { query, transaction } from './helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './auth';
import { getProductFromDB, getProductFromQB, getProductName } from './products';

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
    return await filterEstimates(responseData, oauthClient);
  } catch (e) {
    throw new InputError('Quote Id does not exist: ' + e.message);
  }
}

async function filterEstimates(responseData, oauthClient) {
  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.map(async (estimate) => {
    const productInfo = {};

    for (const line of estimate.Line) {
      if (line.DetailType === 'SubTotalLineDetail') {
        continue;
      }

      const Description = line.Description;
      const itemRef = line.SalesItemLineDetail && line.SalesItemLineDetail.ItemRef;
      const itemValue = itemRef.value;

      const item = await getProductFromQB(itemValue, oauthClient);
      const barcodeItem = await getProductFromDB(item.id);

      productInfo[barcodeItem.barcode] = {
        productName: Description,
        productId: item.id,
        sku: item.sku,
        pickingQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
        originalQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
        pickingStatus: 'pending',
      };
    }

    const customerRef = estimate.CustomerRef;
    return {
      quoteId: estimate.Id,
      customerId: customerRef.value,
      customerName: customerRef.name,
      productInfo,
      totalAmount: estimate.TotalAmt,
      orderStatus: 'pending',
    };
  });

  return Promise.all(filteredEstimatesPromises);
}

export async function estimateToDB(quote) {
  try {
    await transaction(async (client) => {
      // Insert into quotes table dont think I need customerid
      await client.query(
        'INSERT INTO quotes (quoteid, customerid, totalamount, customername, orderstatus) VALUES ($1, $2, $3, $4, $5)',
        [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus]
      );

      // Insert into quoteitems table
      for (const [barcode, item] of Object.entries(quote.productInfo)) {
        await client.query(
          'INSERT INTO quoteitems (quoteid, productid, barcode, productname, pickingqty, originalqty, pickingstatus, sku) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            quote.quoteId,
            item.productId,
            barcode,
            item.productName,
            parseInt(item.pickingQty, 10),
            parseInt(item.originalQty, 10),
            item.pickingStatus,
            item.sku
          ]
        );
      }     
    });
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function checkQuoteExists(quoteId) {
  try {
    const result = await query(
      'SELECT quoteid FROM quotes WHERE quoteid = $1',
      [quoteId]
    );
    return result.length > 0;
  } catch (error) {
    console.error('Error checking if quote exists:', error);
    throw error;
  }
}

export async function fetchQuoteData(quoteId) {
  try {
    const result = await query(`
      SELECT q.*, qi.*
      FROM quotes q
      LEFT JOIN quoteitems qi ON q.quoteid = qi.quoteid
      WHERE q.quoteid = $1
    `, [quoteId]);

    if (result.length === 0) {
      return null;
    }

    const quote = {
      quoteId: result[0].quoteid,
      customerId: result[0].customerid,
      customerName: result[0].customername,
      totalAmount: result[0].totalamount,
      productInfo: {}
    };

    result.forEach(row => {
      if (row.quoteid && row.barcode) {
        quote.productInfo[row.barcode] = {
          quoteId: row.quoteid,
          productId: row.productid,
          productName: row.productname,
          originalQty: row.originalqty,
          pickingQty: row.pickingqty,
          pickingStatus: row.pickingstatus,
          sku: row.sku
        };
      }
    });

    return quote;
  } catch (error) {
    console.error('Error fetching quote data:', error);
    throw error;
  }
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
