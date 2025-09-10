import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction, roundQuantity, formatTimestampForSydney } from '../helpers.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { getProductsFromDBByIds, productIdToExternalId } from './productService.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { ConnectionType } from '../types/auth.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient, Quote as XeroQuote, LineItem as XeroLineItem, Contact as XeroContact } from 'xero-node';
import { Product, PickingStatus } from '../types/product.js';
import { PoolClient } from 'pg';
import {
    CustomerQuote,
    FilteredQuote,
    QuoteFetchError,
    CombinedQuoteItemFromDB,
    BarcodeProcessResult,
    AddProductResult,
    AdjustQuantityResult,
    OrderStatus,
    BulkDeleteResult,
    ProductInfo
} from '../types/quote.js';

export async function getCustomerQuotes(customerId: string, companyId: string, connectionType: ConnectionType): Promise<CustomerQuote[]> {
  try {
    if (connectionType === 'qbo') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
      return await getQboCustomerQuotes(oauthClient, customerId);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero') as XeroClient;
      return await getXeroCustomerQuotes(oauthClient, customerId);
    } else {
      throw new AccessError(`Unsupported connection type: ${connectionType}`);
    }
  } catch (error: any) {
    throw new InputError('Failed to fetch customer quotes: ' + error.message);
  }
}

async function getQboCustomerQuotes(oauthClient: IntuitOAuthClient, customerId: string): Promise<CustomerQuote[]> {
  try {
    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);

    const queryStr = `SELECT * FROM estimate WHERE CustomerRef = '${customerId}'`;
    const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;
    
    const response = await oauthClient.makeApiCall({ url });
    const responseData = response.json;
    
    if (!responseData || !responseData.QueryResponse) {
      return [];
    }
    
    const estimates = responseData.QueryResponse.Estimate || [];

    const customerQuotes: CustomerQuote[] = estimates
      .filter((quote: any) => quote.TxnStatus !== 'Closed')
      .map((quote: any) => ({
        id: Number(quote.Id),
        quoteNumber: quote.DocNumber,
        totalAmount: quote.TotalAmt,
        customerName: quote.CustomerRef.name,
        lastModified: quote.MetaData.LastUpdatedTime,
      }));
    
    return customerQuotes;
  } catch (error: any) {
    throw new Error(`Failed to fetch QBO customer quotes: ${error.message}`);
  }
}

async function getXeroCustomerQuotes(oauthClient: XeroClient, customerId: string): Promise<CustomerQuote[]> {
  try {
    const tenantId = await authSystem.getXeroTenantId(oauthClient);

    let whereFilter = '(Status == "DRAFT")';
    if (customerId) {
      whereFilter += ` AND Contact.ContactID == "${customerId}"`;
    }

    const response = await oauthClient.accountingApi.getQuotes(
      tenantId,
      undefined,
      whereFilter,
    );

    const quotes = response.body.quotes || [];
    
    return quotes.map((quote: XeroQuote) => ({
      id: quote.quoteID!,
      quoteNumber: quote.quoteNumber || '',
      totalAmount: quote.total || 0,
      customerName: quote.contact?.name || 'Unknown Customer',
      lastModified: quote.updatedDateUTC!,
    }));

  } catch (error: any) {
    console.error('Error fetching Xero customer quotes:', error);
    throw new Error(`Failed to fetch Xero customer quotes: ${error.message}`);
  }
}


export async function getEstimate(quoteId: string, companyId: string, rawDataNeeded: boolean, connectionType: ConnectionType): Promise<any> {
  try {
    let estimate;
    if (connectionType === 'qbo') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
      estimate = await getQboEstimate(oauthClient, quoteId);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero') as XeroClient;
      estimate = await getXeroEstimate(oauthClient, quoteId);
    } else {
      throw new AccessError(`Unsupported connection type: ${connectionType}`);
    }

    if (rawDataNeeded) {
      return estimate;
    }

    const filteredQuote = await filterEstimates(estimate, companyId, connectionType);
    return filteredQuote;
  } catch (e: any) {
    throw new InputError(e.message);
  }
}

async function getXeroEstimate(oauthClient: XeroClient, quoteId: string): Promise<XeroQuote> {
  try {
    const tenantId = await authSystem.getXeroTenantId(oauthClient);

    const response = await oauthClient.accountingApi.getQuote(tenantId, quoteId);
    const estimate = response.body.quotes?.[0];

    if (!estimate) {
        throw new Error('Quote not found in Xero');
    }
    return estimate;
  } catch (error: any) {
    console.error('Error fetching Xero quote:', error);
    throw new Error(`Failed to fetch Xero quote: ${error.message}`);
  }
}

export async function getQboEstimate(oauthClient: IntuitOAuthClient, quoteId: string): Promise<any> {
  try {
    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);
    
    const queryStr = `SELECT * FROM estimate WHERE Id = '${quoteId}'`;

    const estimateResponse = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
    });

    return estimateResponse.json;
  } catch (e: any) {
    throw new InputError(e.message);
  }
}

async function filterEstimates(responseData: any, companyId: string, connectionType: ConnectionType): Promise<FilteredQuote | QuoteFetchError | null | (FilteredQuote | QuoteFetchError)[]> {
  if (connectionType === 'qbo') {
    const estimates = responseData.QueryResponse.Estimate;
    if (!estimates || estimates.length === 0) {
      return null;
    }
    
    if (estimates.length === 1) {
      return await filterQboEstimate(estimates[0], companyId, connectionType);
    } else {
      const results: (FilteredQuote | QuoteFetchError)[] = [];
      for (const estimate of estimates) {
        const filtered = await filterQboEstimate(estimate, companyId, connectionType);
        if (filtered) {
          results.push(filtered);
        }
      }
      return results;
    }
  } else if (connectionType === 'xero') {
    return await filterXeroEstimate(responseData, companyId, connectionType);
  } else {
    throw new Error(`Unsupported connection type: ${connectionType}`);
  }
}

async function filterQboEstimate(estimate: any, companyId: string, connectionType: ConnectionType): Promise<FilteredQuote | QuoteFetchError> {
  const itemIds = estimate.Line
    .filter((line: any) => line.DetailType !== 'SubTotalLineDetail')
    .map((line: any) => line.SalesItemLineDetail.ItemRef.value);
    
  const productsFromDB: Product[] = await getProductsFromDBByIds(itemIds, companyId); 
  const productMap = new Map(productsFromDB.map(p => [p.external_item_id, p]));
  const productInfo: Record<string, ProductInfo> = {};
   
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
    quoteNumber: estimate.DocNumber,
    customerId: estimate.CustomerRef.value,
    customerName: estimate.CustomerRef.name,
    productInfo,
    totalAmount: estimate.TotalAmt,
    orderStatus: 'pending',
    lastModified: formatTimestampForSydney(estimate.MetaData.LastUpdatedTime),
    companyId,
    orderNote: estimate.CustomerMemo?.value || null
  };
}

async function filterXeroEstimate(quote: XeroQuote, companyId: string, connectionType: ConnectionType): Promise<FilteredQuote | QuoteFetchError> {
  const lineItems = quote.lineItems || [];
  
  const itemIds = lineItems
    .filter(item => item.itemCode)
    .map(item => item.itemCode!);

  const productsFromDB: Product[] = await getProductsFromDBByIds(itemIds, companyId); 
  const productMap = new Map(productsFromDB.map(p => [p.external_item_id, p]));
  const productInfo: Record<string, ProductInfo> = {};
   
  for (const lineItem of lineItems) {
    if (!lineItem.itemCode) continue;

    const itemId = lineItem.itemCode;
    const itemLocal = productMap.get(itemId);

    if (!itemLocal) {
      return {
        error: true,
        quoteId: quote.quoteID!, 
        message: `Product from ${connectionType.toUpperCase()} not found in our database.`,
        productName: lineItem.description || 'Unknown Product',
      };
    }
    
    productInfo[itemLocal.id] = {
      productName: itemLocal.product_name,
      productId: itemLocal.id,
      sku: itemLocal.sku,
      pickingQty: Number(lineItem.quantity) || 0,
      originalQty: Number(lineItem.quantity) || 0,
      pickingStatus: 'pending',
      price: parseFloat(itemLocal.price),
      quantityOnHand: parseFloat(itemLocal.quantity_on_hand),
      companyId,
      barcode: itemLocal.barcode,
      tax_code_ref: itemLocal.tax_code_ref
    };
  }

  return {
    quoteId: quote.quoteID!,
    quoteNumber: quote.quoteNumber!,
    customerId: quote.contact?.contactID!,
    customerName: quote.contact?.name || 'Unknown Customer',
    productInfo,
    totalAmount: quote.total || 0,
    orderStatus: 'pending',
    lastModified: formatTimestampForSydney(quote.updatedDateUTC!),
    companyId,
    orderNote: quote.reference || null
  };
}

export async function estimateToDB(quote: FilteredQuote): Promise<void> {
  try {
    await transaction(async (client: PoolClient) => {
      const existingQuote = await client.query(
        'SELECT id FROM quotes WHERE id = $1',
        [quote.quoteId]
      );
      if (existingQuote.rows.length > 0) {
        await client.query(
          'UPDATE quotes SET total_amount = $2, status = $3, order_note = $4, quote_number = $5 WHERE id = $1',
          [quote.totalAmount, quote.orderStatus, quote.orderNote, quote.quoteNumber]
        );
      } else {
        await client.query(
          'INSERT INTO quotes (id, quote_number, customer_id, total_amount, status, company_id, order_note) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [quote.quoteId, quote.quoteNumber, quote.customerId, quote.totalAmount, quote.orderStatus, quote.companyId, quote.orderNote]
        );
      }

      await client.query('DELETE FROM quote_items WHERE quote_id = $1', [quote.quoteId]);

      for (const [productId, item] of Object.entries(quote.productInfo)) {
        await client.query(
          'INSERT INTO quote_items (quote_id, product_id, product_name, picking_quantity, original_quantity, picking_status, sku, price, tax_code_ref) VALUES ($1, $2, $3, $4, $5, $6::picking_status, $7, $8, $9)',
          [
            quote.quoteId,
            productId,
            item.productName,
            roundQuantity(item.pickingQty),
            roundQuantity(item.originalQty),
            item.pickingStatus,
            item.sku,
            roundQuantity(item.price),
            item.tax_code_ref
          ]
        );
      }     
    });
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function checkQuoteExists(quoteId: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT id FROM quotes WHERE id = $1',
      [quoteId]
    );
    return result.length > 0;
  } catch (error: any) {
    console.error('Error checking if quote exists:', error);
    throw error;
  }
}

export async function fetchQuoteData(quoteId: string): Promise<FilteredQuote | null> {
  try {
    const result: CombinedQuoteItemFromDB[] = await query(`
      SELECT q.*, qi.*, c.customer_name
      FROM quotes q
      LEFT JOIN quote_items qi ON q.id = qi.quote_id
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `, [quoteId]);

    if (result.length === 0) {
      return null;
    }
    const formattedTime = formatTimestampForSydney(result[0].updated_at);

    const quote: FilteredQuote = {
      quoteId: result[0].id,
      quoteNumber: result[0].quote_number,
      customerId: result[0].customer_id,
      customerName: result[0].customer_name,
      totalAmount: parseFloat(result[0].total_amount),
      orderStatus: result[0].status, 
      lastModified: formattedTime,
      productInfo: {},
      companyId: result[0].company_id,
      orderNote: result[0].order_note,
    };

    result.forEach(row => {
      if (row.quote_id && row.product_id) {
        quote.productInfo[row.product_id] = {
          productId: row.product_id,
          productName: row.product_name,
          originalQty: parseFloat(row.original_quantity),
          pickingQty: parseFloat(row.picking_quantity),
          pickingStatus: row.picking_status,
          sku: row.sku,
          price: parseFloat(row.price),
          companyId: row.company_id,
          barcode: row.barcode,
          tax_code_ref: row.tax_code_ref,
          quantityOnHand: 0,
        };
      }
    });

    return quote;
  } catch (error: any) {
    console.error('Error fetching quote data:', error);
    throw error;
  }
}

async function updateQuotePreparerNames(quoteId: string, userName: string): Promise<void> {
  try {
    const result: { preparer_names: string | null }[] = await query(
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
  } catch (err: any) {
    console.error(`Error updating preparer names for quote ${quoteId} by user ${userName}:`, err);
    throw new Error('Failed to update quote preparer names.');
  }
}

export async function processBarcode(barcode: string, quoteId: string, newQty: number, userName: string): Promise<BarcodeProcessResult> {
  try {
    const checkStatusResult: { picking_status: PickingStatus }[] = await query(
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

    const result: BarcodeProcessResult[] = await query(
      'UPDATE quote_items SET picking_quantity = GREATEST(picking_quantity - $1, 0), picking_status = CASE WHEN picking_quantity - $1 <= 0 THEN \'completed\'::picking_status ELSE picking_status END WHERE quote_id = $2 AND barcode = $3 RETURNING picking_quantity, product_name, picking_status',
      [newQty, quoteId, barcode]
    );

    await updateQuotePreparerNames(quoteId, userName);

    return { productName: result[0].productName, updatedQty: result[0].updatedQty, pickingStatus: result[0].pickingStatus };
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function addProductToQuote(productId: number, quoteId: string, qty: number, companyId: string): Promise<AddProductResult> {
  try {
    const productResult: Product[] = await query('SELECT * FROM products WHERE id = $1', [productId]);
    if (productResult.length === 0) {
      throw new AccessError('Product does not exist in database!');
    }
    const quoteResult: { total_amount: string }[] = await query('SELECT total_amount FROM quotes WHERE id = $1', [quoteId]);
    if (quoteResult.length === 0) {
      throw new AccessError('Quote does not exist in database!');
    }
    let addNewProduct: any = null;
    let addExisitingProduct: any = null;
    let totalAmount: any = 0;
    await transaction(async (client: PoolClient) => {
      const pickingStatus = 'pending';
      const existingItem: { rows: any[] } = await client.query(
        'SELECT * FROM quote_items WHERE quote_id = $1 AND product_id = $2',
        [quoteId, productId]
      );
      
      if (existingItem.rows.length > 0) {
        addExisitingProduct = await client.query(
          'UPDATE quote_items SET picking_quantity = picking_quantity + $1, original_quantity = original_quantity + $1, picking_status = $2 WHERE quote_id = $3 AND product_id = $4 returning *',
          [qty, pickingStatus, quoteId, productId]
        );
      } else {
          addNewProduct = await client.query(
            'INSERT INTO quote_items (quote_id, product_id, picking_quantity, original_quantity, picking_status, barcode, product_name, sku, price, company_id, tax_code_ref) VALUES ($1, $2, $3, $4, $5::picking_status, $6, $7, $8, $9, $10, $11) returning *',
            [quoteId, productId, qty, qty, pickingStatus, productResult[0].barcode, productResult[0].product_name, productResult[0].sku, productResult[0].price, companyId, productResult[0].tax_code_ref]
          );
      }
      
      const price = parseFloat(productResult[0].price) * qty;
      const newTotalAmount =  Number(quoteResult[0].total_amount) + price;
      totalAmount = await client.query('UPDATE quotes SET total_amount = $1 WHERE id = $2 returning total_amount, updated_at', [newTotalAmount, quoteId]);
    });
    if (addNewProduct) {
      return {status: 'new', productInfo: addNewProduct.rows[0], totalAmount: totalAmount.rows[0].total_amount, lastModified: totalAmount.rows[0].updated_at};
    } else {
      return {status: 'exists', productInfo: addExisitingProduct.rows[0], totalAmount: totalAmount.rows[0].total_amount };
    }
  } catch (e: any) {
    throw new AccessError(e.message);
  }
}

export async function adjustProductQuantity(quoteId: string, productId: number, newQty: number): Promise<AdjustQuantityResult> {
  try {
    const quote: { total_amount: string }[] = await query(
      'SELECT total_amount FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quote.length === 0) {
      throw new AccessError('Quote does not exist!');
    }

    const quoteitems: { original_quantity: string }[] = await query(
      'SELECT original_quantity FROM quote_items WHERE quote_id = $1 AND product_id = $2',
      [quoteId, productId]
    );

    if (quoteitems.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    const product: { price: string }[] = await query('SELECT price FROM products WHERE id = $1', [productId]);

    const qtyDiff = newQty - Number(quoteitems[0].original_quantity);
    const priceChange = Number(product[0].price) * qtyDiff;
    const newTotalAmount = Number(quote[0].total_amount) + priceChange;

    const updatedItem: { picking_quantity: number, original_quantity: number }[] = await query(
      'UPDATE quote_items SET picking_quantity = $1, original_quantity = $1 WHERE quote_id = $2 AND product_id = $3 RETURNING picking_quantity, original_quantity',
      [newQty, quoteId, productId]
    );

    const updatedTotalAmt: { total_amount: string }[] = await query('UPDATE quotes SET total_amount = $1 WHERE id = $2 returning total_amount', [newTotalAmount, quoteId]);
    return { pickingQty: updatedItem[0].picking_quantity, originalQty: updatedItem[0].original_quantity, totalAmount: updatedTotalAmt[0].total_amount };
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function setOrderStatus(quoteId: string, newStatus: OrderStatus): Promise<{ orderStatus: OrderStatus }> {
  try {
    const result: { status: OrderStatus }[] = await query(
      'UPDATE quotes SET status = $1 WHERE id = $2 returning status',
      [newStatus, quoteId]
    );
    return {orderStatus: result[0].status};
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function getQuotesWithStatus(status: OrderStatus | 'all'): Promise<any[]> {
  try {
    let queryText: string, queryParams: (OrderStatus | 'all')[] | [];
    
    const baseQuery = `
      SELECT 
        q.id, 
        q.quote_number, 
        q.total_amount, 
        q.status, 
        q.created_at, 
        q.updated_at, 
        q.preparer_names, 
        q.picker_note,
        c.customer_name 
      FROM quotes q
      LEFT JOIN customers c ON q.customer_id = c.id
    `;

    if (status === 'all') {
      queryText = `${baseQuery} ORDER BY q.updated_at DESC`;
      queryParams = [];
    } else {
      queryText = `${baseQuery} WHERE q.status = $1 ORDER BY q.updated_at DESC`;
      queryParams = [status];
    }
    
    const result: any[] = await query(queryText, queryParams);
    return result.map(quote => {
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

      const formattedTimeStarted = formatTimestampForSydney(quote.created_at);
      const formattedLastModified = formatTimestampForSydney(quote.updated_at);

      return {
        id: quote.id,
        quoteNumber: quote.quote_number,
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
  } catch (error: any) {
    console.error('Error fetching quotes with status:', error);
    throw new AccessError('Failed to fetch quotes');
  }
}

export async function savePickerNote(quoteId: string, note: string): Promise<{ pickerNote: string }> {
  try {
    const result: { picker_note: string }[] = await query(
      'UPDATE quotes SET picker_note = $1 WHERE id = $2 RETURNING picker_note',
      [note, quoteId]
    );
    
    if (result.length === 0) {
      throw new InputError('Quote not found');
    }
    
    return {pickerNote: result[0].picker_note};
  } catch (error: any) {
    if (error instanceof InputError) {
      throw error;
    }
    throw new InputError('Failed to save picker note');
  }
}

export async function deleteQuotesBulk(quoteIds: string[]): Promise<BulkDeleteResult> {
  try {
    const result = await transaction(async (client: PoolClient) => {
      const deletedQuotes: { id: string }[] = [];
      const errors: { quoteId: string, error: string }[] = [];
      
      for (const quoteId of quoteIds) {
        try {
          const quoteExists = await client.query(
            'SELECT id FROM quotes WHERE id = $1',
            [quoteId]
          );
          
          if (quoteExists.rows.length === 0) {
            errors.push({ quoteId, error: 'Quote not found' });
            continue;
          }
          
          await client.query(
            'DELETE FROM quote_items WHERE quote_id = $1',
            [quoteId]
          );
          
          const deletedQuote = await client.query(
            'DELETE FROM quotes WHERE id = $1 RETURNING id',
            [quoteId]
          );
          
          if (deletedQuote.rows.length > 0) {
            deletedQuotes.push(deletedQuote.rows[0]);
          }
          
        } catch (error: any) {
          errors.push({ quoteId, error: error.message });
        }
      }
      
      return { deletedQuotes, errors };
    });
    
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
    
  } catch (error: any) {
    throw new InputError(`Bulk delete operation failed: ${error.message}`);
  }
}

export async function updateQuoteInQuickBooks(quoteId: string, quoteLocalDb: FilteredQuote, rawQuoteData: any, companyId: string): Promise<{ message: string }> {
  try {
    const oauthClient = await getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
    
    const qbQuote = rawQuoteData.QueryResponse.Estimate[0];
    
    if (!qbQuote || !qbQuote.SyncToken) {
      throw new AccessError('Invalid QuickBooks quote data or missing SyncToken');
    }
    
    const updatePayload: any = {
      Id: quoteId,
      SyncToken: qbQuote.SyncToken,
      sparse: true,
      Line: []
    };

    for (const localItem of Object.values(quoteLocalDb.productInfo)) {
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
            value: localItem.tax_code_ref || "4"
          }
        }
      };
      
      updatePayload.Line.push(lineItem);
    }
    
    if (updatePayload.Line.length === 0) {
      throw new AccessError('No products found to update in QuickBooks');
    }

    const baseURL = await getBaseURL(oauthClient, 'qbo');
    await oauthClient.makeApiCall( {
      url: `${baseURL}v3/company/${companyId}/estimate?operation=update&minorversion=75`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    await setOrderStatus(quoteId, 'finalised');
    return { message: 'Quote updated successfully in QuickBooks'};
  } catch (error: any) {
    console.error('Error updating quote in QuickBooks:', error);
    throw new AccessError('Failed to update quote in QuickBooks: ' + error.message);
  }
}

export async function ensureQuotesExistInDB(quoteIds: string[], companyId: string, connectionType: ConnectionType): Promise<void> {
    const quotesCheckResult: { id: string }[] = await query(
        'SELECT id FROM quotes WHERE id = ANY($1::text[])',
        quoteIds
    );
    const existingIds = new Set(quotesCheckResult.map(r => r.id));

    const missingIds = quoteIds.filter(id => !existingIds.has(id));

    if (missingIds.length === 0) {
        console.log('All quotes already exist locally.');
        return;
    }

    console.log(`Fetching ${missingIds.length} missing quotes from ${connectionType === 'xero' ? 'Xero' : 'QuickBooks'}...`);

    const newQuotesData = await getEstimatesBulk(missingIds, companyId, connectionType);
    
    if (newQuotesData.length !== missingIds.length) {
        throw new InputError(`Could not find all quotes in ${connectionType === 'xero' ? 'Xero' : 'QuickBooks'}. Please check IDs.`);
    }

    for (const quote of newQuotesData) {
        if (!(quote as QuoteFetchError).error) {
            await estimateToDB(quote as FilteredQuote);
        }
    }

    console.log(`Successfully saved ${newQuotesData.length} new quotes to the database.`);
}


export async function getEstimatesBulk(quoteIds: string[], companyId: string, connectionType: ConnectionType): Promise<(FilteredQuote | QuoteFetchError)[]> {
    try {
        if (connectionType === 'qbo') {
            return await getQboEstimatesBulk(quoteIds, companyId);
        } else if (connectionType === 'xero') {
            return await getXeroEstimatesBulk(quoteIds, companyId);
        } else {
            throw new AccessError(`Unsupported connection type: ${connectionType}`);
        }
    } catch (e: any) {
        throw new InputError(e.message);
    }
}

async function getQboEstimatesBulk(quoteIds: string[], companyId: string): Promise<(FilteredQuote | QuoteFetchError)[]> {
    try {
        const oauthClient = await getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;

        const baseURL = await getBaseURL(oauthClient, 'qbo');
        const realmId = getRealmId(oauthClient);
        
        const allQuotes: (FilteredQuote | QuoteFetchError)[] = [];
        
        for (const quoteId of quoteIds) {
            try {
                const queryStr = `SELECT * FROM estimate WHERE Id = '${quoteId}'`;
                
                const estimateResponse = await oauthClient.makeApiCall({
                    url: `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
                });
                
                const responseData = estimateResponse.json;
                if (responseData.QueryResponse.Estimate && responseData.QueryResponse.Estimate.length > 0) {
                    const filteredQuote = await filterEstimates(responseData, companyId, 'qbo') as FilteredQuote | QuoteFetchError;
                    if (filteredQuote) {
                        allQuotes.push(filteredQuote);
                    }
                }
            } catch (individualError: any) {
                console.error(`Error fetching quote ${quoteId}:`, individualError.message);
            }
        }
        
        return allQuotes;
    } catch (e: any) {
        throw new InputError(e.message);
    }
}

async function getXeroEstimatesBulk(quoteIds: string[], companyId: string): Promise<(FilteredQuote | QuoteFetchError)[]> {
    try {
        const oauthClient = await getOAuthClient(companyId, 'xero') as XeroClient;

        const tenantId = await authSystem.getXeroTenantId(oauthClient);
        
        const estimates: XeroQuote[] = [];
        
        for (const quoteId of quoteIds) {
            try {
                const response = await oauthClient.accountingApi.getQuote(tenantId, quoteId);
                if (response.body.quotes && response.body.quotes.length > 0) {
                    estimates.push(response.body.quotes[0]);
                }
            } catch (error: any) {
                console.error(`Failed to fetch Xero quote ${quoteId}:`, error);
            }
        }

        if (estimates.length === 0) {
            return [];
        }

        const filteredQuotes: (FilteredQuote | QuoteFetchError)[] = [];
        for (const estimate of estimates) {
            try {
                const filteredQuote = await filterEstimates(estimate, companyId, 'xero') as FilteredQuote | QuoteFetchError;
                if (filteredQuote && !(filteredQuote as QuoteFetchError).error) {
                    filteredQuotes.push(filteredQuote);
                }
            } catch (error: any) {
                console.error(`Failed to filter Xero estimate:`, error);
            }
        }

        return filteredQuotes;
    } catch (e: any) {
        throw new InputError(e.message);
    }
}
