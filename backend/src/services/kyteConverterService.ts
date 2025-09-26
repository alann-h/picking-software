import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { fetchCustomersLocal } from './customerService.js';
import { parseAustralianDate } from '../helpers.js';
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
    const customerNameIndex = headers.findIndex(h => h.toLowerCase().includes('customer'));

    if (numberIndex === -1 || dateIndex === -1 || statusIndex === -1 || itemsIndex === -1 || totalIndex === -1 || customerNameIndex === -1) {
      throw new InputError('CSV file is missing required columns: Number, Date, Status, Items Description, Total');
    }

    const pendingOrders: KyteOrder[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const status = values[statusIndex]?.trim();
      
      if (status.toLowerCase() === 'pending order') {
        const order: KyteOrder = {
          number: values[numberIndex]?.trim(),
          date: parseAustralianDate(values[dateIndex]?.trim() || ''),
          itemsDescription: values[itemsIndex]?.trim(),
          total: parseFloat(values[totalIndex]) || 0,
          customerName: values[customerNameIndex]?.trim(),
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
    const match = trimmed.match(/^(\d+)x?\(?(\d+)?\)?\s*(.+)$/);
    
    if (match) {
      const quantity = parseInt(match[1]) || 1;
      let productName = match[3].trim();
      
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
  try {
    const matchedItems: MatchedLineItem[] = [];
    
    for (const item of lineItems) {
      // Try to find product by name (fuzzy match)
      const product = await prisma.product.findFirst({
        where: {
          companyId,
          isArchived: false,
          productName: { contains: item.productName, mode: 'insensitive' },
        },
        select: {
          id: true,
          productName: true,
          sku: true,
          barcode: true,
          price: true,
          externalItemId: true,
          taxCodeRef: true,
        },
      });

      if (product) {
        matchedItems.push({
          ...item,
          productId: Number(product.id),
          sku: product.sku,
          barcode: product.barcode,
          price: product.price.toNumber(),
          externalItemId: product.externalItemId,
          taxCodeRef: product.taxCodeRef,
          matched: true,
        });
      } else {
        // No match found
        matchedItems.push({
          ...item,
          productId: null,
          sku: null,
          barcode: null,
          externalItemId: null,
          price: 0,
          taxCodeRef: null,
          matched: false
        });
      }
    }
    
    return matchedItems;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AccessError(`Failed to match products: ${errorMessage}`);
  }
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
 * Get conversion history for a company with pagination
 * @param {string} companyId - Company ID
 * @param {number} limit - Number of records to return (default: 50)
 * @param {number} offset - Number of records to skip (default: 0)
 * @returns {Object} Object containing history records and pagination info
 */
export async function getConversionHistory(companyId: string, limit = 20, offset = 0): Promise<{
  history: ConversionHistoryRecord[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    // Get total count for pagination
    const totalCount = await prisma.kyteConversion.count({
      where: { companyId },
    });

    // Get paginated records
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
      skip: offset,
    });
    
    const history = conversions.map(record => ({
      orderNumber: record.kyteOrderNumber,
      estimateId: record.quickbooksEstimateId,
      quickbooksUrl: record.quickbooksUrl,
      status: record.status as 'success' | 'failed',
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      history,
      totalCount,
      totalPages,
      currentPage,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new AccessError(`Failed to fetch conversion history: ${errorMessage}`);
  }
}

/**
 * Create QuickBooks estimate from processed order data
 * @param {Object} orderData - Processed order data
 * @param {string} companyId - Company ID
 * @param {string} retrySuffix - Optional suffix to append to quote number for retry attempts
 * @returns {Object} QuickBooks estimate creation result
 */
export async function createQuickBooksEstimate(orderData: ProcessedKyteOrder, companyId: string, retrySuffix?: string): Promise<QuickBooksEstimateResult> {
  try {
    const oauthClient: IntuitOAuthClient = await getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
    const baseURL: string = await getBaseURL(oauthClient, 'qbo');
    const realmId: string = getRealmId(oauthClient);
    
    const matchedItems = orderData.lineItems.filter((item: MatchedLineItem) => item.matched && item.externalItemId);
    // console.log('Matched items:', JSON.stringify(matchedItems, null, 2));
    
    if (matchedItems.length === 0) {
      throw new InputError('No matched products found to create a QuickBooks estimate.');
    }
    
    // Sort matched items by SKU before creating line items
    const sortedMatchedItems = matchedItems.sort((a, b) => {
      const skuA = a.sku || '';
      const skuB = b.sku || '';
      return skuA.localeCompare(skuB);
    });
    
    const lineItems = sortedMatchedItems.map((item: MatchedLineItem) => ({
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
    
    // Use retry suffix if provided (for duplicate quote number handling)
    const docNumber = retrySuffix ? `${orderData.number}-${retrySuffix}` : orderData.number;
    
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
      DocNumber: docNumber,
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
      throw new Error(response.json.Fault.Error[0].Message);
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
      message: retrySuffix ? `Estimate created successfully with modified quote number: ${docNumber}` : 'Estimate created successfully'
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle HTTP errors (like 400) that might indicate duplicate quote numbers
    if (errorMessage.includes('400') || errorMessage.includes('Request failed')) {
      throw new Error(`Quote number "${retrySuffix ? `${orderData.number}-${retrySuffix}` : orderData.number}" already exists in QuickBooks. Please use a unique quote number or modify the existing quote.`);
    }
    
    // Handle other errors
    throw new Error(`Failed to create QuickBooks estimate: ${errorMessage}`);
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
 * Create QuickBooks estimate with automatic retry for duplicate quote numbers
 * @param {Object} orderData - Processed order data
 * @param {string} companyId - Company ID
 * @returns {Object} QuickBooks estimate creation result
 */
export async function createQuickBooksEstimateWithRetry(orderData: ProcessedKyteOrder, companyId: string): Promise<QuickBooksEstimateResult> {
  const retrySuffixes = ['retry', 'copy', 'dup', 'alt', 'new'];
  
  for (let i = 0; i < retrySuffixes.length; i++) {
    try {
      const suffix = i === 0 ? undefined : retrySuffixes[i - 1];
      return await createQuickBooksEstimate(orderData, companyId, suffix);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('already exists in QuickBooks') && i < retrySuffixes.length - 1) {
        console.log(`Quote number "${orderData.number}" already exists, trying with suffix "${retrySuffixes[i]}"`);
        continue;
      }
      
      // If it's not a duplicate error or we've exhausted all suffixes, wrap in InputError
      throw new InputError(`Failed to create QuickBooks estimate: ${errorMessage}`);
    }
  }
  
  throw new InputError(`Failed to create estimate after trying all suffix variations for quote ${orderData.number}`);
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
        
        const result = await createQuickBooksEstimateWithRetry(order, companyId);
        
        
        // Save successful conversion to database
        await saveConversionToDatabase({
          kyteOrderNumber: result.estimateNumber || order.number,
          quickbooksEstimateId: result.estimateId,
          quickbooksUrl: result.quickbooksUrl,
          status: 'success',
          errorMessage: null
        }, companyId);
        
        results.push({
          orderNumber: result.estimateNumber || order.number,
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
