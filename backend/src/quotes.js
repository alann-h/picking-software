import { AccessError, InputError } from './error.js';
import { query, transaction, makeCustomApiCall } from './helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './auth.js';
import { getProductFromDB, getProductFromQB } from './products.js';

export async function getCustomerQuotes(customerId, token) {
  try {
    const oauthClient = await getOAuthClient(token);
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

export async function getQbEstimate(quoteId, token, updateQuote) {
  try {
    const oauthClient = await getOAuthClient(token);
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
    if (!updateQuote) return await filterEstimates(responseData, oauthClient);
    else return responseData;
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
      const item = await getProductFromQB(Description, oauthClient);
      const barcodeItem = await getProductFromDB(item.id);

      productInfo[barcodeItem.barcode] = {
        productName: Description,
        productId: item.id,
        sku: item.sku,
        price: item.price,
        pickingQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
        originalQty: line.SalesItemLineDetail && line.SalesItemLineDetail.Qty,
        pickingStatus: 'pending',
      };
    }
    const customerRef = estimate.CustomerRef;
    const timeStarted = new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date());
    return {
      quoteId: estimate.Id,
      customerId: customerRef.value,
      customerName: customerRef.name,
      productInfo,
      totalAmount: estimate.TotalAmt,
      orderStatus: 'pending',
      timeStarted,
      lastModified: timeStarted,
    };
  });
  return Promise.all(filteredEstimatesPromises);
}

export async function estimateToDB(quote) {
  try {
    await transaction(async (client) => {
      // Check if the quote already exists
      const existingQuote = await client.query(
        'SELECT quoteid FROM quotes WHERE quoteid = $1',
        [quote.quoteId]
      );
      if (existingQuote.rows.length > 0) {
        const lastModified = new Intl.DateTimeFormat('en-GB', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(new Date());
        // Quote exists, update it
        await client.query(
          'UPDATE quotes SET customerid = $2, totalamount = $3, customername = $4, orderstatus = $5, timestarted = $6, lastmodified = $7 WHERE quoteid = $1',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.timeStarted, lastModified]
        );
      } else {
        // Quote doesn't exist, insert it
        await client.query(
          'INSERT INTO quotes (quoteid, customerid, totalamount, customername, orderstatus, timestarted, lastmodified) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.timeStarted, quote.lastModified]
        );
      }

      // Delete existing quote items
      await client.query('DELETE FROM quoteitems WHERE quoteid = $1', [quote.quoteId]);

      // Insert new quote items
      for (const [barcode, item] of Object.entries(quote.productInfo)) {
        await client.query(
          'INSERT INTO quoteitems (quoteid, productid, barcode, productname, pickingqty, originalqty, pickingstatus, sku, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [
            quote.quoteId,
            item.productId,
            barcode,
            item.productName,
            parseInt(item.pickingQty, 10),
            parseInt(item.originalQty, 10),
            item.pickingStatus,
            item.sku,
            item.price
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
      timeStarted: result[0].timestarted,
      orderStatus: result[0].orderstatus,
      lastModified: result[0].lastModified,
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
          sku: row.sku,
          price: row.price
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
    // check the current status of the item
    const checkStatusResult = await query(
      'SELECT pickingstatus FROM quoteitems WHERE quoteid = $1 AND barcode = $2',
      [quoteId, barcode]
    );

    if (checkStatusResult.length === 0) {
      throw new InputError('Quote number is invalid or scanned product does not exist on quote');
    }

    const currentStatus = checkStatusResult[0].pickingstatus;
    
    if (currentStatus === 'completed') {
      throw new InputError(`This item has already been fully picked`);
    } else if (currentStatus !== 'pending') {
      throw new InputError(`Cannot process item. Current status is ${currentStatus}. Please change the status to 'pending' before scanning.`);
    }

    const result = await query(
      'UPDATE quoteitems SET pickingqty = GREATEST(pickingqty - $1, 0), pickingstatus = CASE WHEN pickingqty - $1 <= 0 THEN \'completed\' ELSE pickingstatus END WHERE quoteid = $2 AND barcode = $3 RETURNING pickingqty, productname, pickingstatus',
      [newQty, quoteId, barcode]
    );
    return { productName: result[0].productname, updatedQty: result[0].pickingqty, pickingStatus: result[0].pickingstatus };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function addProductToQuote(productName, quoteId, qty, token) {
  try {
    const product = await query('SELECT * FROM products WHERE productname = $1', [productName]);
    if (product.length === 0) {
      throw new AccessError('Product does not exist in database!');
    }
    const quote = await query('SELECT * FROM quotes WHERE quoteid = $1', [quoteId]);
    if (quote.length === 0) {
      throw new AccessError('Quote does not exist in database!');
    }
    let addNewProduct = null;
    let addExisitingProduct = null;
    let totalAmount = 0;
    await transaction(async (client) => {
      // Check if the product already exists in the quote
      const existingItem = await client.query(
        'SELECT * FROM quoteitems WHERE quoteid = $1 AND productid = $2',
        [quoteId, product[0].productid]
      );
      
      if (existingItem.rows.length > 0) {
        // If the product exists, update the quantities
        addExisitingProduct = await client.query(
          'UPDATE quoteitems SET pickingqty = pickingqty + $1, originalqty = originalqty + $1 WHERE quoteid = $2 AND productid = $3 returning pickingqty, originalqty',
          [qty, quoteId, product[0].productid]
        );
      } else {
          const oauthClient = await getOAuthClient(token);
          if (!oauthClient) {
            throw new AccessError('OAuth client could not be initialized');
          }
          // If the product doesn't exist, insert a new row
          const productFromQB = await getProductFromQB(productName, oauthClient);
          addNewProduct = await client.query(
            'INSERT INTO quoteitems (quoteid, productid, pickingqty, originalqty, pickingstatus, barcode, productname, sku, price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *',
            [quoteId, productFromQB.id, qty, qty,'pending', product[0].barcode, productName, product[0].sku, product[0].price]
          );
      }
      
      const price = product[0].price * qty;
      totalAmount = await client.query('UPDATE quotes SET totalamount = totalamount + $1 WHERE quoteid = $2 returning totalamount', [price, quoteId]);
    });
    if (addNewProduct) {
      return {status: 'new', productInfo: addNewProduct.rows[0], totalAmt: totalAmount.rows[0].totalamount};
    } else {
      return {
        status: 'exists', 
        pickingQty: addExisitingProduct.rows[0].pickingqty, 
        originalQty: addExisitingProduct.rows[0].originalqty, 
        totalAmt: totalAmount.rows[0].totalamount
      };
    }
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
    const product = await query('SELECT * FROM products WHERE productid = $1', [productId]);

    const price = product[0].price * newQty;
    const newTotalAmt = await query('UPDATE quotes SET totalamount = $1 WHERE quoteid = $2 returning totalamount', [price, quoteId]);
    return { pickingQty: result[0].pickingqty, originalQty: result[0].originalqty, totalAmount: newTotalAmt[0].totalamount };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function setOrderStatus(quoteId, newStatus) {
  try {
    const result = await query(
      'UPDATE quotes SET orderstatus = $1 WHERE quoteid = $2 returning orderstatus',
      [newStatus, quoteId]
    );
    return {orderStatus: result[0].orderstatus};
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function getQuotesWithStatus(status) {
  try {
    const result = await query(
      'SELECT * FROM quotes WHERE orderstatus = $1 ORDER BY lastmodified DESC',
      [status]
    );

    return result.map(quote => ({
      id: quote.quoteid,
      customerId: quote.customerid,
      customerName: quote.customername,
      totalAmount: parseFloat(quote.totalamount),
      orderStatus: quote.orderstatus,
      timeStarted: quote.timestarted,
      lastModified: quote.lastmodified
    }));
  } catch (error) {
    throw new AccessError('Failed to fetch quotes');
  }
}

export async function updateQuoteInQuickBooks(quoteId, quoteLocalDb, rawQuoteData, token) {
  try {
    const oauthClient = await getOAuthClient(token);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialized');
    }

    const qbQuote = rawQuoteData.QueryResponse.Estimate[0];
    
    // Prepare the update payload
    const updatePayload = {
      Id: quoteId,
      SyncToken: qbQuote.SyncToken,
      sparse: true,
      Line: []
    };

    for (const localItem of Object.values(quoteLocalDb.productInfo)) {
      // Skip items marked as 'unavailable'
      if (localItem.pickingStatus === 'unavailable') continue;
      const amount = localItem.price * localItem.originalQty;
      
      const lineItem = {
        Description: localItem.productName,
        Amount: amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            value: localItem.productId.toString(),
            name: localItem.productName
          },
          Qty: localItem.originalQty,
          UnitPrice: localItem.price,
          TaxCodeRef: {
            value: "5" // look into this later it just means if it uses gst or not for some reason I needed it
          }
        }
      };

      updatePayload.Line.push(lineItem);
    }

    // Update the quote in QuickBooks
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    await makeCustomApiCall(
      oauthClient,
      `${baseURL}v3/company/${companyID}/estimate?minorversion=73`,
      'POST',
      updatePayload
    );

    await setOrderStatus(quoteId, 'finalised');
    return { message: 'Quote updated successfully in QuickBooks'};
  } catch (error) {
    console.error('Error updating quote in QuickBooks:', error);
    throw new AccessError('Failed to update quote in QuickBooks: ' + error.message);
  }
}
