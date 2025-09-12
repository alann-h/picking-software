import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { fetchCustomersLocal } from './customerService.js';
import {
  KyteOrder,
  KyteLineItem,
  MatchedLineItem,
  ConversionHistoryRecord,
  ProcessedKyteOrder,
  QuickBooksEstimateResult,
  ConversionData,
  ProcessResult,
} from '../types/kyte.js';
import { FrontendCustomer } from '../types/customer.js';
import { IntuitOAuthClient } from '../types/authSystem.js';

/**
 * Parse Kyte CSV data and extract pending orders
 * @param {string} csvContent - Raw CSV content
 * @returns {Array} Array of pending orders with parsed data
 */
export async function parseKyteCSV(csvContent: string): Promise<KyteOrder[]> {
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Find required column indices
    const numberIndex = headers.findIndex(h => h.toLowerCase().includes('number'));
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('datetime'));
    const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));
    const itemsIndex = headers.findIndex(h => h.toLowerCase().includes('items') || h.toLowerCase().includes('description'));
    const totalIndex = headers.findIndex(h => h.toLowerCase().trim() === 'total');
    const observationIndex = headers.findIndex(h => h.toLowerCase().includes('observation'));

    if (numberIndex === -1 || dateIndex === -1 || statusIndex === -1 || itemsIndex === -1 || totalIndex === -1) {
      throw new InputError('CSV file is missing required columns: Number, Date, Status, Items Description, Total');
    }

    const pendingOrders: KyteOrder[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const status = values[statusIndex]?.trim();
      
      if (status.toLowerCase() === 'pending order') {
        const order: KyteOrder = {
          number: values[numberIndex]?.trim(),
          date: values[dateIndex]?.trim(),
          itemsDescription: values[itemsIndex]?.trim(),
          total: parseFloat(values[totalIndex]) || 0,
          customerId: null, // Will be set by user
          lineItems: parseItemsDescription(values[itemsIndex]?.trim() || ''),
          observation: values[observationIndex]?.trim() || ''
        };
        
        pendingOrders.push(order);
      }
    }
    return pendingOrders;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new InputError(`Failed to parse CSV: ${errorMessage}`);
  }
}

/**
 * Parse CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
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
function parseItemsDescription(itemsDescription: string): KyteLineItem[] {
  if (!itemsDescription) return [];
  
  const items: KyteLineItem[] = [];
  // Split by commas first, then by other delimiters
  const itemStrings = itemsDescription.split(/[,;\n\r]/).filter(item => item.trim());
  
  for (const itemString of itemStrings) {
    const trimmed = itemString.trim();
    if (!trimmed) continue;
    
    
    // Try to extract quantity and product name
    // Pattern: "2x(00) Semolina Fine G/S 1KGx12" or "1x Corn Flour Starch G/S 500Gx20"
    const match = trimmed.match(/^(\d+)x?\(?([^)]*)?\)?\s*(.+)$/);
    
    if (match) {
      const quantity = parseInt(match[1]) || 1;
      let productName = match[3].trim();
      
      // Attempt to remove case size like 'x10', 'x12' from the end of product names
      productName = productName.replace(/\s*x\d+$/i, '').trim();
      
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
export async function matchProductsToDatabase(lineItems: KyteLineItem[], companyId: string): Promise<MatchedLineItem[]> {
  const matchedItems: MatchedLineItem[] = [];
  
  for (const item of lineItems) {
    // Use PostgreSQL's similarity function
    const product = await prisma.$queryRaw<Array<{
      id: bigint;
      product_name: string;
      sku: string;
      barcode: string | null;
      price: number;
      external_item_id: string | null;
      tax_code_ref: string | null;
    }>>`
      SELECT 
        id, product_name, sku, barcode, price, external_item_id, tax_code_ref
      FROM products 
      WHERE company_id = ${companyId}::uuid
        AND is_archived = false
        AND (
          similarity(product_name, ${item.productName}) > 0.4 OR
          similarity(sku, ${item.productName}) > 0.4 OR
          similarity(barcode, ${item.productName}) > 0.4
        )
      ORDER BY similarity(product_name, ${item.productName}) DESC
      LIMIT 1
    `;

    if (product && product.length > 0) {
      const matchedProduct = product[0];
      matchedItems.push({
        ...item,
        productId: Number(matchedProduct.id),
        sku: matchedProduct.sku,
        barcode: matchedProduct.barcode,
        price: Number(matchedProduct.price),
        externalItemId: matchedProduct.external_item_id,
        taxCodeRef: matchedProduct.tax_code_ref,
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
        taxCodeRef: null,
        matched: false
      });
    }
  }
  
  return matchedItems;
}

/**
 * Get available customers for mapping
 * @param {string} companyId - Company ID
 * @returns {Array} Array of customers
 */
export async function getAvailableCustomers(companyId: string): Promise<FrontendCustomer[]> {
  try {
    const localCustomers = await fetchCustomersLocal(companyId);
    return localCustomers.map(c => ({
        customerId: c.id,
        customerName: c.customer_name,
        company_id: companyId,
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AccessError(`Failed to fetch customers: ${errorMessage}`);
  }
}

/**
 * Get conversion history for a company
 * @param {string} companyId - Company ID
 * @param {number} limit - Number of records to return (default: 50)
 * @returns {Array} Array of conversion records
 */
export async function getConversionHistory(companyId: string, limit = 50): Promise<ConversionHistoryRecord[]> {
  try {
    const conversions = await prisma.kyteConversion.findMany({
      where: { companyId },
      select: {
        kyteOrderNumber: true,
        quickbooksEstimateId: true,
        quickbooksUrl: true,
        status: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return conversions.map(record => ({
      orderNumber: record.kyteOrderNumber,
      estimateId: record.quickbooksEstimateId,
      quickbooksUrl: record.quickbooksUrl,
      status: record.status as 'success' | 'failed',
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AccessError(`Failed to fetch conversion history: ${errorMessage}`);
  }
}

/**
 * Create QuickBooks estimate from processed order data
 * @param {Object} orderData - Processed order data
 * @param {string} companyId - Company ID
 * @returns {Object} QuickBooks estimate creation result
 */
export async function createQuickBooksEstimate(orderData: ProcessedKyteOrder, companyId: string): Promise<QuickBooksEstimateResult> {
  try {
    const oauthClient: IntuitOAuthClient = await getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
    const baseURL: string = await getBaseURL(oauthClient, 'qbo');
    const realmId: string = getRealmId(oauthClient);
    
    const matchedItems = orderData.lineItems.filter((item: MatchedLineItem) => item.matched && item.externalItemId);
    // console.log('Matched items:', JSON.stringify(matchedItems, null, 2));
    
    if (matchedItems.length === 0) {
      throw new InputError('No matched products found to create a QuickBooks estimate.');
    }
    
    const lineItems = matchedItems.map((item: MatchedLineItem) => ({
      DetailType: 'SalesItemLineDetail',
      Description: item.productName,
      Amount: item.quantity * item.price,
      SalesItemLineDetail: {
        ItemRef: {
          value: item.externalItemId
        },
        Qty: item.quantity,
        UnitPrice: item.price,
        TaxCodeRef: {
          value: item.taxCodeRef || "4"
        }
      }
    }));
    
    const txnDate = new Date(orderData.date).toISOString().split('T')[0];
    
    const estimatePayload = {
      CustomerRef: {
        value: orderData.customerId
      },
      CustomerMemo: {
        value: orderData.observation || `Imported from Kyte - Order ${orderData.number}`
      },
      Line: [
        ...lineItems
      ],
      DocNumber: orderData.number,
      TxnDate: txnDate,
      PrivateNote: `Imported from Kyte - Order ${orderData.number}`
    };

    const response = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${realmId}/estimate?minorversion=75`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(estimatePayload)
    });
    if (response.json?.Fault) {
      const errorDetail = response.json.Fault.Error?.[0] || {};
      const errorMessage = errorDetail.Message || 'Unknown QuickBooks error';
      const errorCode = errorDetail.code || 'Unknown';
      throw new Error(`QuickBooks API Error (${errorCode}): ${errorMessage}`);
    }
    
    const webUrl = baseURL.includes('sandbox') 
      ? 'https://sandbox.qbo.intuit.com/app/'
      : 'https://qbo.intuit.com/app/';
    const quickbooksUrl = `${webUrl}estimate?txnId=${response.json?.Estimate?.Id}`;
    
    return {
      success: true,
      estimateId: response.json?.Estimate?.Id,
      estimateNumber: response.json?.Estimate?.DocNumber,
      quickbooksUrl: quickbooksUrl,
      message: 'Estimate created successfully'
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new InputError(`Failed to create QuickBooks estimate: ${errorMessage}`);
  }
}

/**
 * Save conversion result to database
 * @param {Object} conversionData - Conversion data to save
 * @param {string} companyId - Company ID
 * @returns {Object} Saved conversion record
 */
export async function saveConversionToDatabase(conversionData: ConversionData, companyId: string): Promise<ConversionHistoryRecord | null> {
  try {
    const {
      kyteOrderNumber,
      quickbooksEstimateId,
      quickbooksUrl,
      status,
      errorMessage
    } = conversionData;

    const conversion = await prisma.kyteConversion.upsert({
      where: {
        companyId_kyteOrderNumber: {
          companyId,
          kyteOrderNumber,
        },
      },
      update: {
        quickbooksEstimateId,
        quickbooksUrl,
        status,
        errorMessage,
      },
      create: {
        companyId,
        kyteOrderNumber,
        quickbooksEstimateId,
        quickbooksUrl,
        status,
        errorMessage,
      },
    });

    return {
      orderNumber: conversion.kyteOrderNumber,
      estimateId: conversion.quickbooksEstimateId,
      quickbooksUrl: conversion.quickbooksUrl,
      status: conversion.status as 'success' | 'failed',
      errorMessage: conversion.errorMessage,
      createdAt: conversion.createdAt,
    };
  } catch (error) {
    console.error('Failed to save conversion to database:', error);
    // Don't throw error to avoid breaking the conversion process
    return null;
  }
}

/**
 * Process complete Kyte to QuickBooks conversion
 * @param {Array} orders - Array of orders with customer mappings
 * @param {string} companyId - Company ID
 * @returns {Array} Array of processing results
 */
export async function processKyteToQuickBooks(orders: ProcessedKyteOrder[], companyId: string): Promise<ProcessResult[]> {
  try {
    const results: ProcessResult[] = [];
    
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
        
        // Save successful conversion to database
        await saveConversionToDatabase({
          kyteOrderNumber: order.number,
          quickbooksEstimateId: result.estimateId,
          quickbooksUrl: result.quickbooksUrl,
          status: 'success',
          errorMessage: null
        }, companyId);
        
        results.push({
          orderNumber: order.number,
          success: true,
          estimateId: result.estimateId,
          estimateNumber: result.estimateNumber,
          quickbooksUrl: result.quickbooksUrl,
          message: result.message
        });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Save failed conversion to database
        await saveConversionToDatabase({
          kyteOrderNumber: order.number,
          quickbooksEstimateId: null,
          quickbooksUrl: null,
          status: 'failed',
          errorMessage: errorMessage
        }, companyId);
        
        results.push({
          orderNumber: order.number,
          success: false,
          message: errorMessage
        });
      }
    }
    
    return results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AccessError(`Failed to process orders: ${errorMessage}`);
  }
}
