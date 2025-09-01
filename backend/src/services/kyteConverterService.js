import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query } from '../helpers.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { fetchCustomersLocal } from './customerService.js';

/**
 * Parse Kyte CSV data and extract pending orders
 * @param {string} csvContent - Raw CSV content
 * @returns {Array} Array of pending orders with parsed data
 */
export async function parseKyteCSV(csvContent) {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find required column indices
    const numberIndex = headers.findIndex(h => h.toLowerCase().includes('number'));
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
    const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));
    const itemsIndex = headers.findIndex(h => h.toLowerCase().includes('items') || h.toLowerCase().includes('description'));
    const totalIndex = headers.findIndex(h => h.toLowerCase().trim() === 'total');

    if (numberIndex === -1 || dateIndex === -1 || statusIndex === -1 || itemsIndex === -1 || totalIndex === -1) {
      throw new InputError('CSV file is missing required columns: Number, Date, Status, Items Description, Total');
    }

    const pendingOrders = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const status = values[statusIndex]?.trim().toLowerCase();
      
      if (status === 'pending order') {
        const order = {
          number: values[numberIndex]?.trim(),
          date: values[dateIndex]?.trim(),
          itemsDescription: values[itemsIndex]?.trim(),
          total: parseFloat(values[totalIndex]) || 0,
          customerId: null, // Will be set by user
          lineItems: parseItemsDescription(values[itemsIndex]?.trim() || '')
        };
        
        pendingOrders.push(order);
      }
    }
    return pendingOrders;
  } catch (error) {
    throw new InputError(`Failed to parse CSV: ${error.message}`);
  }
}

/**
 * Parse CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

/**
 * Parse items description to extract quantities and product names
 * @param {string} itemsDescription - Raw items description
 * @returns {Array} Array of parsed line items
 */
function parseItemsDescription(itemsDescription) {
  if (!itemsDescription) return [];
  
  const items = [];
  // Split by commas first, then by other delimiters
  const itemStrings = itemsDescription.split(/[,;\n\r]/).filter(item => item.trim());
  
  for (const itemString of itemStrings) {
    const trimmed = itemString.trim();
    if (!trimmed) continue;
    
    
    // Try to extract quantity and product name
    // Pattern: "2x(00) Semolina Fine G/S 1KGx12" or "1x Corn Flour Starch G/S 500Gx20"
    const match = trimmed.match(/^(\d+)x?\(?(\d+)?\)?\s*(.+)$/);
    
    if (match) {
      const quantity = parseInt(match[1]) || 1;
      const productName = match[3].trim();
      
      
      items.push({
        quantity,
        productName,
        originalText: trimmed
      });
    } else {
      // Fallback: treat as single item with quantity 1
      items.push({
        quantity: 1,
        productName: trimmed,
        originalText: trimmed
      });
    }
  }
  
  return items;
}

/**
 * Match parsed items to products in the database
 * @param {Array} lineItems - Array of parsed line items
 * @param {string} companyId - Company ID
 * @returns {Array} Array of matched products with database info
 */
export async function matchProductsToDatabase(lineItems, companyId) {
  try {
    const matchedItems = [];
    
    for (const item of lineItems) {
      // Try to find product by name (fuzzy match)
      const result = await query(
        `SELECT id, product_name, sku, barcode, price, external_item_id 
         FROM products 
         WHERE company_id = $1 
         AND (LOWER(product_name) LIKE LOWER($2) 
              OR LOWER(sku) LIKE LOWER($2)
              OR LOWER(barcode) LIKE LOWER($2))
         AND is_archived = FALSE
         LIMIT 1`,
        [companyId, `%${item.productName}%`]
      );
      if (result.length > 0) {
        const product = result[0];
        matchedItems.push({
          ...item,
          productId: product.id,
          sku: product.sku,
          barcode: product.barcode,
          price: parseFloat(product.price) || 0,
          externalItemId: product.external_item_id,
          matched: true
        });
      } else {
        // No match found
        matchedItems.push({
          ...item,
          productId: null,
          sku: null,
          barcode: null,
          price: 0,
          externalItemId: null,
          matched: false
        });
      }
    }
    
    return matchedItems;
  } catch (error) {
    throw new AccessError(`Failed to match products: ${error.message}`);
  }
}

/**
 * Get available customers for mapping
 * @param {string} companyId - Company ID
 * @returns {Array} Array of customers
 */
export async function getAvailableCustomers(companyId) {
  try {
    const customers = await fetchCustomersLocal(companyId);
    return customers;
  } catch (error) {
    throw new AccessError(`Failed to fetch customers: ${error.message}`);
  }
}

/**
 * Create QuickBooks estimate from processed order data
 * @param {Object} orderData - Processed order data
 * @param {string} companyId - Company ID
 * @returns {Object} QuickBooks estimate creation result
 */
export async function createQuickBooksEstimate(orderData, companyId) {
  try {
    const oauthClient = await getOAuthClient(companyId, 'qbo');
    const baseURL = getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);
    
    // Filter out unmatched items
    const matchedItems = orderData.lineItems.filter(item => item.matched && item.externalItemId);
    
    if (matchedItems.length === 0) {
      throw new InputError('No matched products found for QuickBooks estimate');
    }
    
    // Build line items for QuickBooks
    const lineItems = matchedItems.map(item => ({
      DetailType: 'SalesItemLineDetail',
      Amount: item.quantity * item.price,
      SalesItemLineDetail: {
        ItemRef: {
          value: item.externalItemId
        },
        Qty: item.quantity,
        UnitPrice: item.price
      }
    }));
    
    // Add subtotal line
    const subtotal = matchedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    // Convert date to ISO format for QuickBooks
    const txnDate = new Date(orderData.date).toISOString().split('T')[0];
    
    const estimatePayload = {
      CustomerRef: {
        value: orderData.customerId
      },
      CurrencyRef: {
        value: 'AUD'
      },
      ProjectRef: {
        value: '1'  // Default project ID - you may need to get this from QBO
      },
      CustomerMemo: {
        value: orderData.observation || `Imported from Kyte - Order ${orderData.number}`
      },
      Line: [
        ...lineItems,
        {
          DetailType: 'SubtotalLineDetail',
          Amount: subtotal,
          SubtotalLineDetail: {}
        }
      ],
      DocNumber: orderData.number,
      TxnDate: txnDate,
      PrivateNote: `Imported from Kyte - Order ${orderData.number}`
    };

    const url = `${baseURL}v3/company/${realmId}/estimate?minorversion=75`;
    
    console.log('Making API call to:', url);
    
    const response = await oauthClient.makeApiCall({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(estimatePayload)
    });

    console.log('API call completed, response received');
    console.log('Response:', JSON.stringify(response.json, null, 2));
    if (response.json?.Fault) {
      const errorMessage = response.json.Fault.Error?.[0]?.Message || 'Unknown QuickBooks error';
      const errorCode = response.json.Fault.Error?.[0]?.code || 'Unknown';
      throw new Error(`QuickBooks API Error (${errorCode}): ${errorMessage}`);
    }
    
    return {
      success: true,
      estimateId: response.json?.Estimate?.Id,
      estimateNumber: response.json?.Estimate?.DocNumber,
      message: 'Estimate created successfully'
    };
    
  } catch (error) {
    throw new InputError(`Failed to create QuickBooks estimate: ${error.message}`);
  }
}

/**
 * Process complete Kyte to QuickBooks conversion
 * @param {Array} orders - Array of orders with customer mappings
 * @param {string} companyId - Company ID
 * @returns {Array} Array of processing results
 */
export async function processKyteToQuickBooks(orders, companyId) {
  try {
    const results = [];
    
    for (const order of orders) {
      try {
        if (!order.customerId) {
          results.push({
            orderNumber: order.number,
            success: false,
            message: 'No customer mapped'
          });
          continue;
        }
        
        const result = await createQuickBooksEstimate(order, companyId);
        results.push({
          orderNumber: order.number,
          success: true,
          estimateId: result.estimateId,
          estimateNumber: result.estimateNumber,
          message: result.message
        });
        
      } catch (error) {
        results.push({
          orderNumber: order.number,
          success: false,
          message: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    throw new AccessError(`Failed to process orders: ${error.message}`);
  }
}
