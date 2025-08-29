import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction, roundQuantity, formatTimestampForSydney } from '../helpers.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { getProductsFromDBByIds, productIdToExternalId } from './productService.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';

export async function getCustomerQuotes(customerId, companyId, connectionType) {
  try {
    if (connectionType === 'qbo') {
      const qboClient = await tokenService.getQBODataClient(companyId);
      return await getQboCustomerQuotes(qboClient, customerId);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero');
      return await getXeroCustomerQuotes(oauthClient, customerId);
    } else {
      throw new AccessError(`Unsupported connection type: ${connectionType}`);
    }
  } catch (error) {
    throw new InputError('Failed to fetch customer quotes: ' + error.message);
  }
}

async function getQboCustomerQuotes(qboClient, customerId) {
  try {
    const response = await new Promise((resolve, reject) => {

      const criteria = `CustomerRef = '${customerId}'`;
      qboClient.findEstimates(criteria, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    const estimates = response.QueryResponse.Estimate || [];
    
    const customerQuotes = estimates
      .filter(quote => quote.TxnStatus !== 'Closed')
      .map(quote => ({
        id: Number(quote.Id),
        totalAmount: quote.TotalAmt,
        customerName: quote.CustomerRef.name,
        lastModified: quote.MetaData.LastUpdatedTime,
      }));
    
    return customerQuotes;
  } catch (error) {
    console.error('Error fetching QBO customer quotes:', error);
    throw new Error(`Failed to fetch QBO customer quotes: ${error.message}`);
  }
}

async function getXeroCustomerQuotes(oauthClient, customerId) {
  try {
    const tenantId = await authSystem.getXeroTenantId(oauthClient);

    // Filter for open quotes - Xero quotes are typically drafts
    let whereFilter = '(Status == "DRAFT")';
    if (customerId) {
      whereFilter += ` AND Contact.ContactID == "${customerId}"`;
    }

    const response = await oauthClient.accountingApi.getQuotes(
      tenantId,
      undefined,  // ifModifiedSince
      whereFilter, // where
      undefined,  // order
      undefined,  // iDs
      1,          // page
      false,      // includeArchived
      undefined,  // searchTerm
      100         // pageSize
    );

    const quotes = response.body.quotes || [];
    
    return quotes.map(quote => ({
      id: Number(quote.quoteID),
      totalAmount: quote.Total || 0,
      customerName: quote.Contact?.name || 'Unknown Customer',
      lastModified: quote.UpdatedDateUTC,
    }));

  } catch (error) {
    console.error('Error fetching Xero customer quotes:', error);
    throw new Error(`Failed to fetch Xero customer quotes: ${error.message}`);
  }
}


export async function getEstimate(quoteId, companyId, rawDataNeeded, connectionType) {
  try {
    let estimate;
    if (connectionType === 'qbo') {
      const qboClient = await tokenService.getQBODataClient(companyId);
      estimate = await getQboEstimate(qboClient, quoteId);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero');
      estimate = await getXeroEstimate(oauthClient, quoteId);
    } else {
      throw new AccessError(`Unsupported connection type: ${connectionType}`);
    }

    if (rawDataNeeded) {
      return estimate;
    }

    const filteredQuote = await filterEstimates(estimate, companyId, connectionType);
    return filteredQuote;
  } catch (e) {
    throw new InputError(e.message);
  }
}

async function getXeroEstimate(oauthClient, quoteId) {
  try {
    const tenantId = await authSystem.getXeroTenantId(oauthClient);

    const response = await oauthClient.accountingApi.getEstimate(tenantId, quoteId);
    const estimate = response.body;

    // Transform Xero estimate to match QBO structure for compatibility
    return estimate;
  } catch (error) {
    console.error('Error fetching Xero estimate:', error);
    throw new Error(`Failed to fetch Xero estimate: ${error.message}`);
  }
}

export async function getQboEstimate(qboClient, quoteId) {
  try {
    const estimateResponse = await new Promise((resolve, reject) => {
      qboClient.getEstimate(quoteId, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    // Transform QBO response to match expected structure
    return {
      QueryResponse: {
        Estimate: [estimateResponse]
      }
    };
  } catch (e) {
    throw new InputError(e.message);
  }
}

async function filterEstimates(responseData, companyId, connectionType) {
  const filteredEstimatesPromises = responseData.QueryResponse.Estimate.map(async (estimate) => {
    const itemIds = estimate.Line
      .filter(line => line.DetailType !== 'SubTotalLineDetail')
      .map(line => line.SalesItemLineDetail.ItemRef.value);

    const productsFromDB = await getProductsFromDBByIds(itemIds); 

    const productMap = new Map(productsFromDB.map(p => [p.qbo_item_id, p]));

    const productInfo = {};
     
    for (const line of estimate.Line) {
      if (line.DetailType === 'SubTotalLineDetail') continue;

      const itemId = line.SalesItemLineDetail.ItemRef.value;
      const itemLocal = productMap.get(itemId);

      if (!itemLocal) {
        return {
          error: true,
          quoteId: estimate.Id,
          message: `Product from ${connectionType.toUpperCase()} not found in our database.`,
          productName: line.SalesItemLineDetail.ItemRef.name.split(':').pop().trim(),
        };
      }
      
      productInfo[itemLocal.id] = {
        productName: itemLocal.product_name,
        productId: itemLocal.id,
        sku: itemLocal.sku,
        pickingQty: line.SalesItemLineDetail?.Qty || 0,
        originalQty: line.SalesItemLineDetail?.Qty || 0,
        pickingStatus: 'pending',
        price: parseFloat(itemLocal.price),
        quantityOnHand: parseFloat(itemLocal.quantity_on_hand),
        companyId,
        barcode: itemLocal.barcode,
        tax_code_ref: itemLocal.tax_code_ref
      };
    }

    return {
      quoteId: estimate.Id,
      customerId: estimate.CustomerRef.value,
      customerName: estimate.CustomerRef.name,
      productInfo,
      totalAmount: estimate.TotalAmt,
      orderStatus: 'pending',
      lastModified: formatTimestampForSydney(estimate.MetaData.LastUpdatedTime),
      companyId,
      orderNote: estimate.CustomerMemo?.value || null
    };
  });

  return Promise.all(filteredEstimatesPromises);
}

export async function estimateToDB(quote) {
  try {
    await transaction(async (client) => {
      // Check if the quote already exists
      const existingQuote = await client.query(
        'SELECT id FROM quotes WHERE id = $1',
        [quote.quoteId]
      );
      if (existingQuote.rows.length > 0) {
        // Quote exists, update it
        await client.query(
          'UPDATE quotes SET id = $2, total_amount = $3, customer_name = $4, status = $5, order_note = $6 WHERE id = $1',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.orderNote]
        );
      } else {
        // Quote doesn't exist, insert it
        await client.query(
          'INSERT INTO quotes (id, customer_id, total_amount, customer_name, status, company_id, order_note) VALUES ($1, $2, $3, $4, $5::order_status, $6, $7)',
          [quote.quoteId, quote.customerId, parseFloat(quote.totalAmount), quote.customerName, quote.orderStatus, quote.companyId, quote.orderNote]
        );
      }

      // Delete existing quote items
      await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quote.quoteId]);

      // Insert new quote items
      for (const [productId, item] of Object.entries(quote.productInfo)) {
        await client.query(
          'INSERT INTO quote_items (quote_id, product_id, barcode, product_name, picking_quantity, original_quantity, picking_status, sku, price, company_id, tax_code_ref) VALUES ($1, $2, $3, $4, $5, $6, $7::picking_status, $8, $9, $10, $11)',
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
      'SELECT id FROM quotes WHERE id = $1',
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
      LEFT JOIN quote_items qi ON q.id = qi.quote_id
      WHERE q.id = $1
    `, [quoteId]);

    if (result.length === 0) {
      return null;
    }
    const formattedTime = formatTimestampForSydney(result[0].updated_at);

    const quote = {
      quoteId: result[0].id,
      customerId: result[0].customer_id,
      customerName: result[0].customer_name,
      totalAmount: result[0].total_amount,
      timeStarted: result[0].created_at,
      orderStatus: result[0].status, 
      lastModified: formattedTime,
      productInfo: {},
      companyId: result[0].company_id,
      pickerNote: result[0].picker_note,
      orderNote: result[0].order_note
    };

    result.forEach(row => {
      if (row.quote_id && row.product_id) {
        quote.productInfo[row.product_id] = {
          quoteId: row.quote_id,
          productId: row.product_id,
          productName: row.product_name,
          originalQty: row.original_quantity,
          pickingQty: row.picking_quantity,
          pickingStatus: row.picking_status,
          sku: row.sku,
          price: row.price,
          companyId: row.company_id,
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
      'SELECT preparer_names FROM quotes WHERE id = $1',
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
        'UPDATE quotes SET preparer_names = $1 WHERE id = $2',
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
      'SELECT picking_status FROM quote_items WHERE quote_id = $1 AND barcode = $2',
      [quoteId, barcode]
    );

    if (checkStatusResult.length === 0) {
      throw new InputError('Quote number is invalid or scanned product does not exist on quote');
    }

    const currentStatus = checkStatusResult[0].picking_status;
    
    if (currentStatus === 'completed') {
      throw new InputError(`This item has already been fully picked`);
    } else if (currentStatus !== 'pending') {
      throw new InputError(`Cannot process item. Current status is ${currentStatus}. Please change the status to 'pending' before scanning.`);
    }

    const result = await query(
      'UPDATE quote_items SET picking_quantity = GREATEST(picking_quantity - $1, 0), picking_status = CASE WHEN picking_quantity - $1 <= 0 THEN \'completed\' ELSE picking_status END WHERE quote_id = $2 AND barcode = $3 RETURNING picking_quantity, product_name, picking_status',
      [newQty, quoteId, barcode]
    );

    await updateQuotePreparerNames(quoteId, userName);

    return { productName: result[0].product_name, updatedQty: result[0].picking_quantity, pickingStatus: result[0].picking_status };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function addProductToQuote(productId, quoteId, qty, companyId) {
  try {
    const product = await query('SELECT * FROM products WHERE id = $1', [productId]);
    if (product.length === 0) {
      throw new AccessError('Product does not exist in database!');
    }
    const quote = await query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
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
        'SELECT * FROM quote_items WHERE quote_id = $1 AND product_id = $2',
        [quoteId, productId]
      );
      
      if (existingItem.rows.length > 0) {
        // If the product exists, update the quantities
        addExisitingProduct = await client.query(
          'UPDATE quote_items SET picking_quantity = picking_quantity + $1, original_quantity = original_quantity + $1, picking_status = $2 WHERE quote_id = $3 AND product_id = $4 returning *',
          [qty, pickingStatus, quoteId, productId]
        );
      } else {
          const oauthClient = await getOAuthClient(companyId);
          if (!oauthClient) {
            throw new AccessError('OAuth client could not be initialised');
          }
          // If the product doesn't exist, insert a new row
          addNewProduct = await client.query(
            'INSERT INTO quote_items (quote_id, product_id, picking_quantity, original_quantity, picking_status, barcode, product_name, sku, price, company_id, tax_code_ref) VALUES ($1, $2, $3, $4, $5::picking_status, $6, $7, $8, $9, $10, $11) returning *',
            [quoteId, productId, qty, qty, pickingStatus, product[0].barcode, product[0].product_name, product[0].sku, product[0].price, companyId, product[0].tax_code_ref]
          );
      }
      
      const price = product[0].price * qty;
      const newTotalAmount =  Number(quote[0].total_amount) + price;
      totalAmount = await client.query('UPDATE quotes SET total_amount = $1 WHERE id = $2 returning total_amount', [newTotalAmount, quoteId]);
    });
    if (addNewProduct) {
      return {status: 'new', productInfo: addNewProduct.rows[0], totalAmount: totalAmount.rows[0].total_amount, lastModified: totalAmount.rows[0].updated_at};
    } else {
      return {status: 'exists', productInfo: addExisitingProduct.rows[0], totalAmount: totalAmount.rows[0].total_amount };
    }
  } catch (e) {
    throw new AccessError(e.message);
  }
}

export async function adjustProductQuantity(quoteId, productId, newQty) {
  try {
    const quote = await query(
      'SELECT total_amount FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quote.length === 0) {
      throw new AccessError('Quote does not exist!');
    }

    const quoteitems = await query(
      'SELECT original_quantity FROM quote_items WHERE quote_id = $1 AND product_id = $2',
      [quoteId, productId]
    );

    if (quoteitems.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    const product = await query('SELECT price FROM products WHERE id = $1', [productId]);

    const qtyDiff = newQty - Number(quoteitems[0].original_quantity);
    const priceChange = Number(product[0].price) * qtyDiff;
    const newTotalAmount = Number(quote[0].total_amount) + priceChange;

    const updatedItem = await query(
      'UPDATE quote_items SET picking_quantity = $1, original_quantity = $1 WHERE quote_id = $2 AND product_id = $3 RETURNING picking_quantity, original_quantity',
      [newQty, quoteId, productId]
    );

    const updatedTotalAmt = await query('UPDATE quotes SET total_amount = $1 WHERE id = $2 returning total_amount', [newTotalAmount, quoteId]);
    return { pickingQty: updatedItem[0].picking_quantity, originalQty: updatedItem[0].original_quantity, totalAmount: updatedTotalAmt[0].total_amount };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function setOrderStatus(quoteId, newStatus) {
  try {
    const result = await query(
      'UPDATE quotes SET status = $1 WHERE id = $2 returning status',
      [newStatus, quoteId]
    );
    return {orderStatus: result[0].status};
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function getQuotesWithStatus(status) {
  try {
    let queryText, queryParams;
    
    if (status === 'all') {
      queryText = 'SELECT * FROM quotes ORDER BY updated_at DESC';
      queryParams = [];
    } else {
      queryText = 'SELECT * FROM quotes WHERE status = $1 ORDER BY updated_at DESC';
      queryParams = [status];
    }
    
    const result = await query(queryText, queryParams);
    return result.map(quote => {
      // Calculate time taken using raw timestamps BEFORE formatting
      let timeTaken = 'N/A';
      if (quote.created_at && quote.updated_at) {
        const start = new Date(quote.created_at);
        const end = new Date(quote.updated_at);
        
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diffMs = end.getTime() - start.getTime();
          
          if (diffMs >= 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (diffHours > 0) {
              timeTaken = `${diffHours}h ${diffMinutes}m`;
            } else {
              timeTaken = `${diffMinutes}m`;
            }
          } else {
            timeTaken = 'Invalid time';
          }
        }
      }

      // Format timestamps AFTER calculation
      const formattedTimeStarted = formatTimestampForSydney(quote.created_at);
      const formattedLastModified = formatTimestampForSydney(quote.updated_at);

      return {
        id: quote.id,
        customerId: quote.id,
        customerName: quote.customer_name,
        totalAmount: parseFloat(quote.total_amount),
        orderStatus: quote.status,
        timeStarted: formattedTimeStarted,
        lastModified: formattedLastModified,
        timeTaken: timeTaken,
        companyId: quote.id,
        preparerNames: quote.preparer_names,
        pickerNote: quote.picker_note
      };
    });
  } catch (error) {
    console.error('Error fetching quotes with status:', error);
    throw new AccessError('Failed to fetch quotes');
  }
}

export async function savePickerNote(quoteId, note) {
  try {
    const result = await query(
      'UPDATE quotes SET picker_note = $1 WHERE id = $2 RETURNING picker_note',
      [note, quoteId]
    );
    
    if (result.length === 0) {
      throw new InputError('Quote not found');
    }
    
    return {pickerNote: result[0].picker_note};
  } catch (error) {
    if (error instanceof InputError) {
      throw error;
    }
    throw new InputError('Failed to save picker note');
  }
}

export async function deleteQuotesBulk(quoteIds) {
  try {
    const result = await transaction(async (client) => {
      const deletedQuotes = [];
      const errors = [];
      
      for (const quoteId of quoteIds) {
        try {
          // First, check if quote exists
          const quoteExists = await client.query(
            'SELECT id FROM quotes WHERE id = $1',
            [quoteId]
          );
          
          if (quoteExists.length === 0) {
            errors.push({ quoteId, error: 'Quote not found' });
            continue;
          }
          
          await client.query(
            'DELETE FROM quote_items WHERE quote_id = $1',
            [quoteId]
          );
          
          // Delete the quote
          const deletedQuote = await client.query(
            'DELETE FROM quotes WHERE id = $1 RETURNING id, id',
            [quoteId]
          );
          
          if (deletedQuote.length > 0) {
            deletedQuotes.push(deletedQuote[0]);
          }
          
        } catch (error) {
          errors.push({ quoteId, error: error.message });
        }
      }
      
      return { deletedQuotes, errors };
    });
    
    // Prepare response
    const successCount = result.deletedQuotes.length;
    const errorCount = result.errors.length;
    
    if (errorCount === 0) {
      return {
        success: true,
        message: `Successfully deleted ${successCount} quote${successCount !== 1 ? 's' : ''}`,
        deletedCount: successCount,
        deletedQuotes: result.deletedQuotes
      };
    } else if (successCount === 0) {
      return {
        success: false,
        message: `Failed to delete any quotes. ${errorCount} error${errorCount !== 1 ? 's' : ''} occurred.`,
        errors: result.errors
      };
    } else {
      return {
        success: true,
        message: `Partially successful: deleted ${successCount} quote${successCount !== 1 ? 's' : ''}, ${errorCount} failed`,
        deletedCount: successCount,
        deletedQuotes: result.deletedQuotes,
        errors: result.errors
      };
    }
    
  } catch (error) {
    throw new InputError(`Bulk delete operation failed: ${error.message}`);
  }
}

export async function updateQuoteInQuickBooks(quoteId, quoteLocalDb, rawQuoteData, companyId) {
  try {
    const oauthClient = await getOAuthClient(companyId);
    if (!oauthClient) {
      throw new AccessError('OAuth client could not be initialised');
    }
    
    const qbQuote = rawQuoteData.QueryResponse.Estimate[0];
    
    // Validate QuickBooks data
    if (!qbQuote || !qbQuote.SyncToken) {
      throw new AccessError('Invalid QuickBooks quote data or missing SyncToken');
    }
    
    // Prepare the update payload
    const updatePayload = {
      Id: quoteId,
      SyncToken: qbQuote.SyncToken,
      sparse: true,
      Line: []
    };

    for (const localItem of Object.values(quoteLocalDb.productInfo)) {
      // Skip items marked as unavailable
      if (localItem.pickingStatus === 'unavailable') {
        continue;
      }
      
      if (localItem.pickingStatus === 'pending') {
        throw new AccessError('Quote must not have any products pending!');
      }
      
      const amount = Number(localItem.price) * Number(localItem.originalQty);
      const externalId = await productIdToExternalId(localItem.productId);
      
      if (!externalId) {
        throw new AccessError(`Product ${localItem.productName} not found in QuickBooks`);
      }
      
      const lineItem = {
        Description: localItem.productName,
        Amount: amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            value: externalId,
            name: localItem.productName
          },
          Qty: Number(localItem.originalQty),
          UnitPrice: Number(localItem.price),
          TaxCodeRef: {
            value: localItem.taxCodeRef || "4"
          }
        }
      };
      
      updatePayload.Line.push(lineItem);
    }
    
    if (updatePayload.Line.length === 0) {
      throw new AccessError('No products found to update in QuickBooks');
    }

    // Update the quote in QuickBooks
    const baseURL = getBaseURL(oauthClient);
    await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${companyId}/estimate?operation=update&minorversion=75`,
      method: 'POST',
      body: updatePayload,
      headers: {
        'Content-Type': 'application/json'
      }
    });

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
        'SELECT id FROM quotes WHERE id = ANY($1::int[])',
        [quoteIds]
    );
    const existingIds = new Set(quotesCheckResult.map(r => r.id));

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
        const realmId = getRealmId(oauthClient);
        
        const idList = quoteIds.map(id => `'${id}'`).join(',');
        const queryStr = `SELECT * FROM estimate WHERE Id IN (${idList})`;

        const estimateResponse = await oauthClient.makeApiCall({
            url: `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
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
