import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction, makeCustomApiCall, roundQuantity } from '../helpers.js';
import { getOAuthClient, getBaseURL, getCompanyId } from './authService.js';
import { getProductFromDB, productIdToQboId } from './productService.js';

export async function getCustomerQuotes(customerId, token) {
  try {
    const oauthClient = await getOAuthClient(token);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
    }
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);

    const queryStr = `SELECT * from estimate WHERE CustomerRef='${customerId}'`;
    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyID}/query?query=${queryStr}&minorversion=75`
    });

    const responseJSON = response.json;
    const filteredEstimates = responseJSON.QueryResponse.Estimate.filter(estimate => estimate.TxnStatus !== 'Closed');
    return filteredEstimates;
  } catch {
    throw new InputError('This quote does not exist');
  }
}

async function filterEstimates(responseData, companyId) {
  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.map(async (estimate) => {
    const productInfo = {};

    for (const line of estimate.Line) {
      if (line.DetailType === 'SubTotalLineDetail') {
        continue;
      }

      const itemId = line.SalesItemLineDetail.ItemRef.value;
      const itemLocal = await getProductFromDB(itemId);

      productInfo[itemLocal.productid] = {
        productName: itemLocal.productname,
        productId: itemLocal.productid,
        sku: itemLocal.sku,
        price: itemLocal.price,
        pickingQty: line.SalesItemLineDetail?.Qty || 0,
        originalQty: line.SalesItemLineDetail?.Qty || 0,
        pickingStatus: 'pending',
        companyId,
        barcode: itemLocal.barcode,
        tax_code_ref: itemLocal.tax_code_ref
      };
    }
    const customerRef = estimate.CustomerRef;
    const orderNote = estimate.CustomerMemo;

    const timeStarted = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
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
      companyId,
      orderNote: orderNote?.value || null
    };
  });
  return Promise.all(filteredEstimatesPromises);
}

export async function getQbEstimate(quoteId, token, rawDataNeeded) {
  try {
    const oauthClient = await getOAuthClient(token);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
    }

    const companyId = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    const queryStr = `SELECT * FROM estimate WHERE Id = '${quoteId}'`;
    const estimateResponse = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyId}/query?query=${queryStr}&minorversion=75`
    });

    const responseData = estimateResponse.json;
    if (rawDataNeeded) return responseData;
    
    const filteredQuote = await filterEstimates(responseData, companyId);
    return filteredQuote;
  } catch (e) {
    throw new InputError(e.message);
  }
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
        const lastModified = new Intl.DateTimeFormat('en-AU', {
          timeZone: 'Australia/Sydney',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(new Date());
        // Quote exists, update it
        await client.query(
          'UPDATE quotes SET customerid = $2, totalamount = $3, customername = $4, orderstatus = $5, timestarted = $6, lastmodified = $7, ordernote = $8 WHERE quoteid = $1',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.timeStarted, lastModified, quote.orderNote]
        );
      } else {
        // Quote doesn't exist, insert it
        await client.query(
          'INSERT INTO quotes (quoteid, customerid, totalamount, customername, orderstatus, timestarted, lastmodified, companyid, ordernote) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.timeStarted, quote.lastModified, quote.companyId, quote.orderNote]
        );
      }

      // Delete existing quote items
      await client.query('DELETE FROM quoteitems WHERE quoteid = $1', [quote.quoteId]);

      // Insert new quote items
      for (const [productId, item] of Object.entries(quote.productInfo)) {
        await client.query(
          'INSERT INTO quoteitems (quoteid, productid, barcode, productname, pickingqty, originalqty, pickingstatus, sku, price, companyid, tax_code_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          [
            quote.quoteId,
            productId,
            item.barcode,
            item.productName,
            roundQuantity(item.pickingQty),
            roundQuantity(item.originalQty),
            item.pickingStatus,
            item.sku,
            roundQuantity(item.price),
            quote.companyId,
            item.tax_code_ref
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

    const lastModified = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date());

    await query(`
      UPDATE quotes
      SET lastmodified = $1
      WHERE quoteid = $2
    `, [lastModified, quoteId]);

    const quote = {
      quoteId: result[0].quoteid,
      customerId: result[0].customerid,
      customerName: result[0].customername,
      totalAmount: result[0].totalamount,
      timeStarted: result[0].timestarted,
      orderStatus: result[0].orderstatus, 
      lastModified: lastModified,
      productInfo: {},
      companyId: result[0].companyid,
      pickerNote: result[0].pickernote,
      orderNote: result[0].ordernote
    };

    result.forEach(row => {
      if (row.quoteid && row.productid) {
        quote.productInfo[row.productid] = {
          quoteId: row.quoteid,
          productId: row.productid,
          productName: row.productname,
          originalQty: row.originalqty,
          pickingQty: row.pickingqty,
          pickingStatus: row.pickingstatus,
          sku: row.sku,
          price: row.price,
          companyId: row.companyid,
          barcode: row.barcode,
          taxCodeRef: row.tax_code_ref
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

    await query('UPDATE quotes SET lastmodified = CURRENT_TIMESTAMP WHERE quoteid = $1', [quoteId]);

    return { productName: result[0].productname, updatedQty: result[0].pickingqty, pickingStatus: result[0].pickingstatus };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function addProductToQuote(productId, quoteId, qty, token, companyId) {
  try {
    const product = await query('SELECT * FROM products WHERE productid = $1', [productId]);
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
      const pickingStatus = 'pending';
      // Check if the product already exists in the quote
      const existingItem = await client.query(
        'SELECT * FROM quoteitems WHERE quoteid = $1 AND productid = $2',
        [quoteId, productId]
      );
      
      if (existingItem.rows.length > 0) {
        // If the product exists, update the quantities
        addExisitingProduct = await client.query(
          'UPDATE quoteitems SET pickingqty = pickingqty + $1, originalqty = originalqty + $1, pickingstatus = $2 WHERE quoteid = $3 AND productid = $4 returning *',
          [qty, pickingStatus, quoteId, productId]
        );
      } else {
          const oauthClient = await getOAuthClient(token);
          if (!oauthClient) {
            throw new AccessError('OAuth client could not be initialised');
          }
          // If the product doesn't exist, insert a new row
          addNewProduct = await client.query(
            'INSERT INTO quoteitems (quoteid, productid, pickingqty, originalqty, pickingstatus, barcode, productname, sku, price, companyid, tax_code_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *',
            [quoteId, productId, qty, qty, pickingStatus, product[0].barcode, product[0].productname, product[0].sku, product[0].price, companyId, product[0].tax_code_ref]
          );
      }
      
      const price = product[0].price * qty;
      const newTotalAmount =  Number(quote[0].totalamount) + price;
      totalAmount = await client.query('UPDATE quotes SET totalamount = $1, lastmodified = CURRENT_TIMESTAMP WHERE quoteid = $2 returning totalamount', [newTotalAmount, quoteId]);
    });
    if (addNewProduct) {
      return {status: 'new', productInfo: addNewProduct.rows[0], totalAmt: totalAmount.rows[0].totalamount};
    } else {
      return {status: 'exists', productInfo: addExisitingProduct.rows[0], totalAmt: totalAmount.rows[0].totalamount};
    }
  } catch (e) {
    throw new AccessError(e.message);
  }
}

export async function adjustProductQuantity(quoteId, productId, newQty) {
  try {
    const quote = await query(
      'SELECT totalamount FROM quotes WHERE quoteid = $1',
      [quoteId]
    );

    if (quote.length === 0) {
      throw new AccessError('Quote does not exist!');
    }

    const quoteitems = await query(
      'SELECT originalqty FROM quoteitems WHERE quoteid = $1 AND productid = $2',
      [quoteId, productId]
    );

    if (quoteitems.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    const product = await query('SELECT price FROM products WHERE productid = $1', [productId]);

    const qtyDiff = newQty - Number(quoteitems[0].originalqty);
    const priceChange = Number(product[0].price) * qtyDiff;
    const newTotalAmount = Number(quote[0].totalamount) + priceChange;

    const updatedItem = await query(
      'UPDATE quoteitems SET pickingqty = $1, originalqty = $1 WHERE quoteid = $2 AND productid = $3 RETURNING pickingqty, originalqty',
      [newQty, quoteId, productId]
    );

    const updatedTotalAmt = await query('UPDATE quotes SET totalamount = $1, lastmodified = CURRENT_TIMESTAMP WHERE quoteid = $2 returning totalamount', [newTotalAmount, quoteId]);
    return { pickingQty: updatedItem[0].pickingqty, originalQty: updatedItem[0].originalqty, totalAmount: updatedTotalAmt[0].totalamount };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function setOrderStatus(quoteId, newStatus) {
  try {
    const result = await query(
      'UPDATE quotes SET orderstatus = $1, lastmodified = CURRENT_TIMESTAMP WHERE quoteid = $2 returning orderstatus',
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
      lastModified: quote.lastmodified,
      companyId: quote.companyid
    }));
  } catch (error) {
    throw new AccessError('Failed to fetch quotes');
  }
}

export async function savePickerNote(quoteId, note) {
  try {
    const result = await query('UPDATE quotes SET pickernote = $1 WHERE quoteid = $2 returning pickernote', [note, quoteId]);

    return {pickerNote: result[0].pickernote};

  } catch(error) {
    throw new AccessError(`Issue with saving note! ${error.message}`);
  }
}

export async function updateQuoteInQuickBooks(quoteId, quoteLocalDb, rawQuoteData, token) {
  try {
    const oauthClient = await getOAuthClient(token);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
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
      const amount = Number(localItem.price) * Number(localItem.originalQty);

      const qboItemId = await productIdToQboId(localItem.productId);
      const lineItem = {
        Description: localItem.productName,
        Amount: amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            value: qboItemId,
            name: localItem.productName
          },
          Qty: Number(localItem.originalQty),
          UnitPrice: Number(localItem.price),
          TaxCodeRef: {
            value: localItem.taxCodeRef
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
      `${baseURL}v3/company/${companyID}/estimate?operation=update&minorversion=75`,
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
