import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction, makeCustomApiCall, roundQuantity, formatTimestampForSydney } from '../helpers.js';
import { getOAuthClient, getBaseURL } from './authService.js';
import { getProductFromDB, productIdToQboId } from './productService.js';

export async function getCustomerQuotes(customerId, companyId) {
  try {
    const oauthClient = await getOAuthClient(companyId);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
    }
    const baseURL = getBaseURL(oauthClient);

    const queryStr = `SELECT * from estimate WHERE CustomerRef='${customerId}'`;
    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
    });

    const responseJSON = response.json;
    const estimates = responseJSON.QueryResponse.Estimate || [];

    const customerQuotes = estimates
      .filter(quote => quote.TxnStatus !== 'Closed')
      .map(quote => ({
        id: Number(quote.Id),
        totalAmount: quote.TotalAmt,
        customerName: quote.CustomerRef.name,
        lastModified: quote.MetaData.LastUpdatedTime,
      }));
    return customerQuotes;
  } catch {
    throw new InputError('This quote does not exist');
  }
}

async function filterEstimates(responseData, companyId) {
  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.map(async (estimate) => {
    const productInfo = {};
    let productNameForError = ''; 

    for (const line of estimate.Line) {
      if (line.DetailType === 'SubTotalLineDetail') {
        continue;
      }

      const itemId = line.SalesItemLineDetail.ItemRef.value;
      let productName = line.SalesItemLineDetail.ItemRef.name;
      productNameForError = productName;

      const colonIndex = productName.indexOf(':');
      if (colonIndex !== -1) {
        productName = productName.substring(colonIndex + 1).trim();
      } else {
        productName = productName.trim();
      }

      try {
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
      } catch (error) {
        if (error.message.includes('does not exist within the database')) {
          return {
            error: true,
            quoteId: estimate.Id,
            customerName: customerRef.name,
            message: `Product from QuickBooks not found in our database.`,
            productName: productNameForError
          };        
        }
        throw error;
      }
    }

    const customerRef = estimate.CustomerRef;
    const orderNote = estimate.CustomerMemo;

    return {
      quoteId: estimate.Id,
      customerId: customerRef.value,
      customerName: customerRef.name,
      productInfo,
      totalAmount: estimate.TotalAmt,
      orderStatus: 'pending',
      lastModified: estimate.MetaData.LastUpdatedTime,
      companyId,
      orderNote: orderNote?.value || null
    };
  });
  return Promise.all(filteredEstimatesPromises);
}

export async function getQbEstimate(quoteId, companyId, rawDataNeeded) {
  try {
    const oauthClient = await getOAuthClient(companyId);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
    }

    const baseURL = getBaseURL(oauthClient);
    const queryStr = `SELECT * FROM estimate WHERE Id = '${quoteId}'`;
    const estimateResponse = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
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
        // Quote exists, update it
        await client.query(
          'UPDATE quotes SET customerid = $2, totalamount = $3, customername = $4, orderstatus = $5, ordernote = $6 WHERE quoteid = $1',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.orderNote]
        );
      } else {
        // Quote doesn't exist, insert it
        await client.query(
          'INSERT INTO quotes (quoteid, customerid, totalamount, customername, orderstatus, companyid, ordernote) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.companyId, quote.orderNote]
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
    const formattedTime = formatTimestampForSydney(result[0].lastmodified);

    const quote = {
      quoteId: result[0].quoteid,
      customerId: result[0].customerid,
      customerName: result[0].customername,
      totalAmount: result[0].totalamount,
      timeStarted: result[0].timestarted,
      orderStatus: result[0].orderstatus, 
      lastModified: formattedTime,
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

/**
 * Updates the list of preparer names for a given quote.
 * Adds the current user's name if not already present.
 * @param {number} quoteId The ID of the quote.
 * @param {string} userName The name of the user performing the action.
 */
async function updateQuotePreparerNames(quoteId, userName) {
  try {
    const result = await query(
      'SELECT preparer_names FROM quotes WHERE quoteid = $1',
      [quoteId]
    );

   const currentNames = (result.length > 0 && result[0].preparer_names)
      ? result[0].preparer_names.split(',').map(name => name.trim().toLowerCase())
      : [];

    const normalizedNewName = userName.trim().toLowerCase();

    if (!currentNames.includes(normalizedNewName)) {
      currentNames.push(normalizedNewName);
      currentNames.sort();

      const updatedNamesString = currentNames.join(', ');

      await query(
        'UPDATE quotes SET preparer_names = $1 WHERE quoteid = $2',
        [updatedNamesString, quoteId]
      );
      console.log(`Quote ${quoteId}: Preparer names updated to "${updatedNamesString}" by ${userName}`);
    }
  } catch (err) {
    console.error(`Error updating preparer names for quote ${quoteId} by user ${userName}:`, err);
    throw new Error('Failed to update quote preparer names.');
  }
}

export async function processBarcode(barcode, quoteId, newQty, userName) {
  try {
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

    await updateQuotePreparerNames(quoteId, userName);

    return { productName: result[0].productname, updatedQty: result[0].pickingqty, pickingStatus: result[0].pickingstatus };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function addProductToQuote(productId, quoteId, qty, companyId) {
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
          const oauthClient = await getOAuthClient(companyId);
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
      totalAmount = await client.query('UPDATE quotes SET totalamount = $1 WHERE quoteid = $2 returning totalamount', [newTotalAmount, quoteId]);
    });
    if (addNewProduct) {
      return {status: 'new', productInfo: addNewProduct.rows[0], totalAmount: totalAmount.rows[0].totalamount, lastModified: totalAmount.rows[0].lastmodified};
    } else {
      return {status: 'exists', productInfo: addExisitingProduct.rows[0], totalAmount: totalAmount.rows[0].totalamount };
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

    const updatedTotalAmt = await query('UPDATE quotes SET totalamount = $1 WHERE quoteid = $2 returning totalamount', [newTotalAmount, quoteId]);
    return { pickingQty: updatedItem[0].pickingqty, originalQty: updatedItem[0].originalqty, totalAmount: updatedTotalAmt[0].totalamount };
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

    return result.map(quote => {
      const formattedTimeStarted = formatTimestampForSydney(quote.timestarted);
      const formattedLastModified = formatTimestampForSydney(quote.lastmodified);

      return {
        id: quote.quoteid,
        customerId: quote.customerid,
        customerName: quote.customername,
        totalAmount: parseFloat(quote.totalamount),
        orderStatus: quote.orderstatus,
        timeStarted: formattedTimeStarted,
        lastModified: formattedLastModified,
        companyId: quote.companyid,
        preparerNames: quote.preparer_names
      };
    });
  } catch (error) {
    console.error('Error fetching quotes with status:', error);
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

export async function updateQuoteInQuickBooks(quoteId, quoteLocalDb, rawQuoteData, companyId) {
  try {
    const oauthClient = await getOAuthClient(companyId);
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
      if (localItem.pickingStatus === 'pending') return AccessError('Wuote must not have any products pending!');
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
    const baseURL = getBaseURL(oauthClient);
    await makeCustomApiCall(
      oauthClient,
      `${baseURL}v3/company/${companyId}/estimate?operation=update&minorversion=75`,
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

/**
 * Ensures all quotes in a list exist in the local database.
 * Fetches any missing quotes from QuickBooks and saves them.
 * This is a key step to provide a seamless user experience.
 * @param {number[]} quoteIds - An array of quote IDs to check and potentially fetch.
 * @param {string} companyId - The ID of the company.
 */
export async function ensureQuotesExistInDB(quoteIds, companyId) {
    const quotesCheckResult = await query(
        'SELECT quoteid FROM quotes WHERE quoteid = ANY($1::int[])',
        [quoteIds]
    );
    const existingIds = new Set(quotesCheckResult.map(r => r.quoteid));

    const missingIds = quoteIds.filter(id => !existingIds.has(id));

    if (missingIds.length === 0) {
        console.log('All quotes already exist locally.');
        return;
    }

    console.log(`Fetching ${missingIds.length} missing quotes from QuickBooks...`);

    const newQuotesData = await getQbEstimatesBulk(missingIds, companyId);
    
    if (newQuotesData.length !== missingIds.length) {
        throw new InputError(`Could not find all quotes in QuickBooks. Please check IDs.`);
    }

    for (const quote of newQuotesData) {
        await estimateToDB(quote);
    }

    console.log(`Successfully saved ${newQuotesData.length} new quotes to the database.`);
}


/**
 * A new bulk version of getQbEstimate for efficiency.
 * @param {number[]} quoteIds - An array of quote IDs to fetch.
 * @param {string} companyId - The ID of the company.
 */
export async function getQbEstimatesBulk(quoteIds, companyId) {
    try {
        const oauthClient = await getOAuthClient(companyId);
        if (!oauthClient) throw new AccessError('OAuth client could not be initialised');

        const baseURL = getBaseURL(oauthClient);
        
        const idList = quoteIds.map(id => `'${id}'`).join(',');
        const queryStr = `SELECT * FROM estimate WHERE Id IN (${idList})`;

        const estimateResponse = await oauthClient.makeApiCall({
            url: `${baseURL}v3/company/${companyId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
        });

        const responseData = estimateResponse.json;
        if (!responseData.QueryResponse.Estimate) {
            return [];
        }

        const filteredQuotes = await filterEstimates(responseData, companyId);
        return filteredQuotes;
    } catch (e) {
        throw new InputError(e.message);
    }
}
