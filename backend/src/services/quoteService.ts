import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { roundQuantity, formatTimestampForSydney } from '../helpers.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { getProductsFromDBByIds, getProductsFromDBBySkus, productIdToExternalId } from './productService.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { ConnectionType } from '../types/auth.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient, Quote as XeroQuote } from 'xero-node';
import { Product, PickingStatus } from '../types/product.js';
import { prisma } from '../lib/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import {
    CustomerQuote,
    FilteredQuote,
    QuoteFetchError,
    BarcodeProcessResult,
    AddProductResult,
    AdjustQuantityResult,
    OrderStatus,
    BulkDeleteResult,
    ProductInfo
} from '../types/quote.js';

// Helper to handle QBO API calls with rate limit retry
async function makeQboApiCallWithRetry(oauthClient: IntuitOAuthClient, url: string, retries = 3): Promise<any> {
  try {
    return await oauthClient.makeApiCall({ url });
  } catch (error: any) {
    // Check for 429 Too Many Requests (or other transient errors)
    if (retries > 0 && (error?.response?.status === 429 || error?.code === 429)) {
       const delay = (4 - retries) * 2000; // 2s, 4s, 6s...
       console.warn(`QBO 429 Rate Limit hit. Retrying in ${delay}ms...`);
       await new Promise(r => setTimeout(r, delay));
       return makeQboApiCallWithRetry(oauthClient, url, retries - 1);
    }
    throw error;
  }
}

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new InputError('Failed to fetch customer quotes: ' + error.message);
    }
    throw new InputError('An unknown error occurred while fetching customer quotes.');
  }
}

async function getQboCustomerQuotes(oauthClient: IntuitOAuthClient, customerId: string): Promise<CustomerQuote[]> {
  try {
    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);

    const queryStr = `SELECT * FROM estimate WHERE CustomerRef = '${customerId}' ORDERBY MetaData.LastUpdatedTime DESC`;
    const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;
    

    
    // Use retry wrapper
    const response = await makeQboApiCallWithRetry(oauthClient, url);
    const responseData = response.json;
    
    if (!responseData || !responseData.QueryResponse) {
      return [];
    }
    
    const estimates = responseData.QueryResponse.Estimate || [];

    const customerQuotes: CustomerQuote[] = estimates
      .filter((quote: Record<string, unknown>) => quote.TxnStatus !== 'Closed')
      .map((quote: Record<string, unknown>) => ({
        id: Number(quote.Id),
        quoteNumber: quote.DocNumber,
        totalAmount: quote.TotalAmt,
        customerName: (quote.CustomerRef as Record<string, unknown>).name as string,
        lastModified: (quote.MetaData as Record<string, unknown>).LastUpdatedTime as string,
        createdAt: quote.TxnDate as string,
      }));
    
    return customerQuotes;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch QBO customer quotes: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching QBO customer quotes.');
  }
}

async function getXeroCustomerQuotes(oauthClient: XeroClient, customerId: string): Promise<CustomerQuote[]> {
  try {
    const { tenantId } = await authSystem.getXeroTenantId(oauthClient);

    const response = await oauthClient.accountingApi.getQuotes(
      tenantId,
      undefined,  // ifModifiedSince
      undefined,  // dateFrom
      undefined,  // dateTo
      undefined,  // expiryDateFrom
      undefined,  // expiryDateTo
      customerId, // contactID
      'DRAFT',    // status
    );

    const quotes = response.body.quotes || [];
    
    return quotes.map((quote: XeroQuote) => ({
      id: quote.quoteID!,
      quoteNumber: quote.quoteNumber || '',
      totalAmount: quote.total || 0,
      customerName: quote.contact?.name || 'Unknown Customer',
      lastModified: quote.updatedDateUTC!,
      createdAt: quote.dateString || quote.date || '',
    }));

  } catch (error: unknown) {
    console.error('Error fetching Xero customer quotes:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Xero customer quotes: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching Xero customer quotes.');
  }
}

export async function fetchQuotesSince(companyId: string, connectionType: ConnectionType, lastSyncTime: Date): Promise<(FilteredQuote | QuoteFetchError)[]> {
  try {
    if (connectionType === 'qbo') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
      return await getQboQuotesSince(oauthClient, lastSyncTime, companyId);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero') as XeroClient;
      return await getXeroQuotesSince(oauthClient, lastSyncTime, companyId);
    } else {
      throw new AccessError(`Unsupported connection type: ${connectionType}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new InputError('Failed to fetch changed quotes: ' + error.message);
    }
    throw new InputError('An unknown error occurred while fetching changed quotes.');
  }
}

async function getQboQuotesSince(oauthClient: IntuitOAuthClient, lastSyncTime: Date, companyId: string): Promise<(FilteredQuote | QuoteFetchError)[]> {
  try {
    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);
    
    // Format date as ISO 8601 string for QBO query
    const formattedTime = lastSyncTime.toISOString();

    const queryStr = `SELECT * FROM Estimate WHERE MetaData.LastUpdatedTime > '${formattedTime}' ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 1000`;
    const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;
    
    // Use retry wrapper
    const response = await makeQboApiCallWithRetry(oauthClient, url);
    const responseData = response.json;
    
    if (!responseData || !responseData.QueryResponse) {
      return [];
    }
    
    const estimates = responseData.QueryResponse.Estimate || [];
    if (estimates.length === 0) return [];

    const activeEstimates = estimates.filter((quote: Record<string, unknown>) => quote.TxnStatus !== 'Closed');
    
    // --- BULK PRODUCT FETCH ---
    const allItemIds = new Set<string>();
    
    for (const estimate of activeEstimates) {
        const lines = estimate.Line as Array<Record<string, unknown>> || [];
        for (const line of lines) {
             const salesItemLineDetail = line.SalesItemLineDetail as Record<string, unknown>;
             if (salesItemLineDetail && salesItemLineDetail.ItemRef) {
                 const itemRef = salesItemLineDetail.ItemRef as Record<string, unknown>;
                 if (itemRef.value) allItemIds.add(itemRef.value as string);
             }
        }
    }

    let productMap = new Map<string, Product>();
    if (allItemIds.size > 0) {
        const products = await getProductsFromDBByIds(Array.from(allItemIds), companyId);
        // Typescript fix: ensure key is string
        products.forEach(p => {
            if (p.externalItemId) productMap.set(p.externalItemId, p);
        });
    }

    // --- TRANSFORM ---
    const results: (FilteredQuote | QuoteFetchError)[] = [];
    for (const estimate of activeEstimates) {
        const result = await filterQboEstimate(estimate, companyId, 'qbo', productMap);
        results.push(result);
    }

    return results;

  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch QBO quotes since ${lastSyncTime}: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching QBO quotes.');
  }
}

async function getXeroQuotesSince(oauthClient: XeroClient, lastSyncTime: Date, companyId: string): Promise<(FilteredQuote | QuoteFetchError)[]> {
  try {
    const { tenantId } = await authSystem.getXeroTenantId(oauthClient);

    const response = await oauthClient.accountingApi.getQuotes(
      tenantId,
      lastSyncTime, // ifModifiedSince
      undefined,  // dateFrom
      undefined,  // dateTo
      undefined,  // expiryDateFrom
      undefined,  // expiryDateTo
      undefined, // contactID
      undefined,    // status
    );

    const quotes = response.body.quotes || [];
    
    // Xero getQuotes often returns summaries. We need to check if line items are present.
    // If NOT present, we must fetch details. 
    // To handle bulk efficiency, we can fetch details in parallel patches.
    
    const results: (FilteredQuote | QuoteFetchError)[] = [];
    const BATCH_SIZE = 10;
    
        // We'll process them in chunks
    for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
        const chunk = quotes.slice(i, i + BATCH_SIZE);

        // Optimistic Bulk Fetch: Collect SKUs from this chunk
        const allSkus = new Set<string>();
        chunk.forEach(q => {
             (q.lineItems || []).forEach(item => {
                 if (item.itemCode) allSkus.add(item.itemCode);
             });
        });

        let productMap = new Map<string, Product>();
        if (allSkus.size > 0) {
             const products = await getProductsFromDBBySkus(Array.from(allSkus), companyId);
             products.forEach(p => {
                 if (p.sku) productMap.set(p.sku, p);
             });
        }

        await Promise.all(chunk.map(async (quote) => {
             try {
                const result = await filterXeroEstimate(quote, companyId, 'xero', productMap);
                results.push(result);
             } catch (err: unknown) {
                 results.push({
                     error: true,
                     quoteId: quote.quoteID || 'unknown',
                     message: err instanceof Error ? err.message : 'Unknown Xero mapping error',
                     productName: 'Unknown'
                 });
             }
        }));
    }

    return results;

  } catch (error: unknown) {
    console.error('Error fetching Xero global quotes:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Xero quotes: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching Xero quotes.');
  }
}


export async function getEstimate(quoteId: string, companyId: string, rawDataNeeded: boolean, connectionType: ConnectionType): Promise<FilteredQuote | QuoteFetchError | null | (FilteredQuote | QuoteFetchError)[] | Record<string, unknown>> {
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
      return estimate as Record<string, unknown>;
    }

    const filteredQuote = await filterEstimates(estimate as Record<string, unknown>, companyId, connectionType);
    return filteredQuote;
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new InputError(e.message);
    }
    throw new InputError('An unknown error occurred while getting the estimate.');
  }
}

async function getXeroEstimate(oauthClient: XeroClient, quoteId: string): Promise<XeroQuote> {
  try {
    const { tenantId } = await authSystem.getXeroTenantId(oauthClient);

    const response = await oauthClient.accountingApi.getQuote(tenantId, quoteId);
    const estimate = response.body.quotes?.[0];

    if (!estimate) {
        throw new Error('Quote not found in Xero');
    }
    return estimate;
  } catch (error: unknown) {
    console.error('Error fetching Xero quote:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Xero quote: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching the Xero quote.');
  }
}

export async function getQboEstimate(oauthClient: IntuitOAuthClient, quoteId: string): Promise<Record<string, unknown>> {
  try {
    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);
    
    // Use direct API read instead of query
    // Use direct API read instead of query, with retry
    const response = await makeQboApiCallWithRetry(oauthClient, `${baseURL}v3/company/${realmId}/estimate/${quoteId}?minorversion=75`);
    
    // Direct read returns the object directly, wrap it in QueryResponse structure for compatibility
    return {
       QueryResponse: {
         Estimate: [response.json.Estimate]
       }
    };
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new InputError(e.message);
    }
    throw new InputError('An unknown error occurred while getting the QBO estimate.');
  }
}

async function filterEstimates(responseData: Record<string, unknown>, companyId: string, connectionType: ConnectionType): Promise<FilteredQuote | QuoteFetchError | null | (FilteredQuote | QuoteFetchError)[]> {
  if (connectionType === 'qbo') {
    const queryResponse = responseData.QueryResponse as Record<string, unknown>;
    const estimates = queryResponse.Estimate as Array<Record<string, unknown>>;
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

async function filterQboEstimate(estimate: Record<string, unknown>, companyId: string, connectionType: ConnectionType, preFetchedProductMap?: Map<string, Product>): Promise<FilteredQuote | QuoteFetchError> {
  const estimateLine = estimate.Line as Array<Record<string, unknown>>;
  let productMap: Map<string, Product>;

  if (preFetchedProductMap) {
      productMap = preFetchedProductMap;
      // We still need to verify if we missed any (e.g. if the bulk fetch logic missed some)
      // But assuming bulk fetch was correct, we iterate.
  } else {
      // FALBACK: Old logic (fetch specific IDs)
      const itemIds = estimateLine
        .filter((line: Record<string, unknown>) => {
          if (line.DetailType === 'SubTotalLineDetail' || line.DetailType === 'TaxLineDetail') return false;
          const amount = line.Amount as number;
          if (amount && amount < 0) return false;
          const salesItemLineDetail = line.SalesItemLineDetail as Record<string, unknown>;
          if (!salesItemLineDetail || !salesItemLineDetail.ItemRef) return false;
          const itemRef = salesItemLineDetail.ItemRef as Record<string, unknown>;
          const itemId = itemRef.value as string;
          if (itemId === 'SHIPPING_ITEM_ID') return false;
          return true;
        })
        .map((line: Record<string, unknown>) => {
          const salesItemLineDetail = line.SalesItemLineDetail as Record<string, unknown>;
          const itemRef = salesItemLineDetail.ItemRef as Record<string, unknown>;
          return itemRef.value as string;
        });
        
      const productsFromDB = await getProductsFromDBByIds(itemIds, companyId); 
      productMap = new Map();
      productsFromDB.forEach(p => {
          if (p.externalItemId) productMap.set(p.externalItemId, p);
      });
  }
  const productInfo: Record<string, ProductInfo> = {};
   
  for (const line of estimateLine) {
    if (line.DetailType === 'SubTotalLineDetail' || line.DetailType === 'TaxLineDetail') {
      continue;
    }
    const amount = line.Amount as number;
    if (amount && amount < 0) {
      continue;
    }

    const salesItemLineDetail = line.SalesItemLineDetail as Record<string, unknown>;
    
    // Skip lines without ItemRef (description-only lines without SKU)
    if (!salesItemLineDetail || !salesItemLineDetail.ItemRef) {
      console.log('Skipping line item without ItemRef (description-only line):', {
        quoteId: estimate.Id,
        lineDetail: line.DetailType,
        lineDescription: line.Description
      });
      continue;
    }
    
    const itemRef = salesItemLineDetail.ItemRef as Record<string, unknown>;
    const itemId = itemRef.value as string;
    
    // Skip shipping items
    if (itemId === 'SHIPPING_ITEM_ID') {
      continue;
    }
    
    const itemLocal = productMap.get(itemId);

    if (!itemLocal) {
      const itemName = itemRef.name ? (itemRef.name as string).split(':').pop()?.trim() : null;
      const lineDescription = line.Description as string;
      const detailType = line.DetailType as string;
      const amount = line.Amount as number;
      
      console.log('Problematic line item:', {
        itemId,
        itemName,
        lineDescription,
        detailType,
        amount,
        fullLine: line
      });
      
      const productIdentifier = [
        itemName && `Name: ${itemName}`,
        lineDescription && `Description: ${lineDescription}`,
        `Item ID: ${itemId}`,
        `Type: ${detailType}`,
        amount && `Amount: $${amount}`
      ].filter(Boolean).join(' - ');
      
      return {
        error: true,
        quoteId: estimate.Id as string,
        message: `Product from ${connectionType.toUpperCase()} not found in our database.`,
        productName: productIdentifier || `Item ID: ${itemId}`,
      };
    }
    
    const qty = (salesItemLineDetail.Qty as number) || 0;
    
    if (productInfo[itemLocal.id.toString()]) {
      productInfo[itemLocal.id.toString()].pickingQty += qty;
      productInfo[itemLocal.id.toString()].originalQty += qty;
    } else {
      productInfo[itemLocal.id.toString()] = {
        productName: itemLocal.productName,
        productId: Number(itemLocal.id),
        sku: itemLocal.sku,
        pickingQty: qty,
        originalQty: qty,
        pickingStatus: 'pending',
        price: parseFloat(itemLocal.price.toString()),
        quantityOnHand: parseFloat(itemLocal.quantityOnHand.toString()),
        companyId,
        barcode: itemLocal.barcode,
        tax_code_ref: itemLocal.taxCodeRef
      };
    }
  }

    const customerRef = estimate.CustomerRef as Record<string, unknown>;
    const metaData = estimate.MetaData as Record<string, unknown>;
    const customerMemo = estimate.CustomerMemo as Record<string, unknown> | undefined;
    
    return {
      quoteId: estimate.Id as string,
      quoteNumber: estimate.DocNumber as string,
      customerId: customerRef.value as string,
      customerName: customerRef.name as string,
      productInfo,
      totalAmount: estimate.TotalAmt as number,
      orderStatus: 'pending',
      lastModified: formatTimestampForSydney(metaData.LastUpdatedTime as string),
      companyId,
      orderNote: customerMemo?.value as string || null,
      pickerNote: null,
      externalSyncUrl: null,
      preparerNames: null
    };
}

async function filterXeroEstimate(quote: XeroQuote, companyId: string, connectionType: ConnectionType, preFetchedProductMap?: Map<string, Product>): Promise<FilteredQuote | QuoteFetchError> {
  const lineItems = quote.lineItems || [];
  let productMap: Map<string, Product>;

  if (preFetchedProductMap) {
      productMap = preFetchedProductMap;
  } else {
      const skus = lineItems
        .filter(item => item.itemCode)
        .map(item => item.itemCode!);
      const productsFromDB: Product[] = await getProductsFromDBBySkus(skus, companyId); 
      productMap = new Map();
      productsFromDB.forEach(p => {
          if (p.sku) productMap.set(p.sku, p);
      });
  }
  const productInfo: Record<string, ProductInfo> = {};
   
  for (const lineItem of lineItems) {
    // Skip lines without itemCode (description-only lines without SKU)
    if (!lineItem.itemCode) {
      console.log('Skipping line item without itemCode (description-only line):', {
        quoteId: quote.quoteID,
        lineDescription: lineItem.description
      });
      continue;
    }

    const sku = lineItem.itemCode;
    const itemLocal = productMap.get(sku);

    if (!itemLocal) {
      return {
        error: true,
        quoteId: quote.quoteID!, 
        message: `Product from ${connectionType.toUpperCase()} not found in our database.`,
        productName: lineItem.description || 'Unknown Product',
      };
    }
    
    productInfo[itemLocal.id.toString()] = {
      productName: itemLocal.productName,
      productId: Number(itemLocal.id),
      sku: itemLocal.sku,
      pickingQty: Number(lineItem.quantity) || 0,
      originalQty: Number(lineItem.quantity) || 0,
      pickingStatus: 'pending',
      price: parseFloat(itemLocal.price.toString()),
      quantityOnHand: parseFloat(itemLocal.quantityOnHand.toString()),
      companyId,
      barcode: itemLocal.barcode,
      tax_code_ref: itemLocal.taxCodeRef
    };
  }

  return {
    quoteId: quote.quoteID!,
    quoteNumber: quote.quoteNumber!,
    customerId: quote.contact?.contactID || '',
    customerName: quote.contact?.name || 'Unknown Customer',
    productInfo,
    totalAmount: quote.total || 0,
    orderStatus: 'pending',
    lastModified: formatTimestampForSydney(quote.updatedDateUTC!),
    companyId,
    orderNote: quote.reference || null,
    pickerNote: null,
    externalSyncUrl: null,
    preparerNames: null
  };
}

export async function estimateToDB(quote: FilteredQuote): Promise<void> {
  try {
    await prisma.$transaction(async (tx: any) => {
      // Check if quote exists to determine if this is an update or create
      const existingQuote = await tx.quote.findUnique({
        where: { id: quote.quoteId },
        include: {
          quoteItems: true, // Get existing items to preserve picking progress
        },
      });

      // Upsert the quote (but preserve status if it's already assigned/preparing/checking/completed)
      await tx.quote.upsert({
        where: { id: quote.quoteId },
        update: {
          totalAmount: quote.totalAmount,
          // Preserve current status if it's assigned/preparing/checking/completed (don't override with QB status)
          status: existingQuote && ['assigned', 'preparing', 'checking', 'completed'].includes(existingQuote.status) 
            ? existingQuote.status 
            : quote.orderStatus,
          orderNote: quote.orderNote,
          quoteNumber: quote.quoteNumber,
        },
        create: {
          id: quote.quoteId,
          quoteNumber: quote.quoteNumber,
          customerId: quote.customerId,
          totalAmount: quote.totalAmount,
          status: quote.orderStatus,
          companyId: quote.companyId,
          orderNote: quote.orderNote,
        },
      });

      // If this is a new quote (no existing items), just create everything fresh
      if (!existingQuote || existingQuote.quoteItems.length === 0) {
        // Delete any existing items (shouldn't be any, but just in case)
        await tx.quoteItem.deleteMany({
          where: { quoteId: quote.quoteId },
        });

        // Create all new quote items
        for (const [productId, item] of Object.entries(quote.productInfo)) {
          await tx.quoteItem.create({
            data: {
              quoteId: quote.quoteId,
              productId: Number(productId),
              productName: item.productName,
              pickingQuantity: roundQuantity(item.pickingQty),
              originalQuantity: roundQuantity(item.originalQty),
              pickingStatus: item.pickingStatus,
              sku: item.sku,
              price: roundQuantity(item.price),
              taxCodeRef: item.tax_code_ref,
            },
          });
        }
      } else {
        // SMART MERGE: Preserve picking progress while updating QB changes
        
        // Build a map of existing items with their picking progress
        const existingItemsMap = new Map<string, { pickingQuantity: Decimal; pickingStatus: PickingStatus; originalQuantity: Decimal }>(
          existingQuote.quoteItems.map((item: any) => [
            item.productId.toString(),
            {
              pickingQuantity: item.pickingQuantity,
              pickingStatus: item.pickingStatus,
              originalQuantity: item.originalQuantity,
            }
          ])
        );

        // Get all product IDs from QB
        const incomingProductIds = new Set(Object.keys(quote.productInfo));
        const existingProductIds = new Set(existingQuote.quoteItems.map((item: any) => item.productId.toString()));

        // 1. DELETE items that no longer exist in QB
        const itemsToDelete = Array.from(existingProductIds).filter((id: unknown) => !incomingProductIds.has(id as string));
        if (itemsToDelete.length > 0) {
          await tx.quoteItem.deleteMany({
            where: {
              quoteId: quote.quoteId,
              productId: { in: itemsToDelete.map((id: unknown) => BigInt(id as string | number | boolean)) },
            },
          });
          console.log(`🗑️  Removed ${itemsToDelete.length} items no longer in QuickBooks`);
        }

        // 2. UPDATE existing items (preserve picking progress, update QB fields)
        for (const [productId, item] of Object.entries(quote.productInfo)) {
          const existingProgress = existingItemsMap.get(productId);

          if (existingProgress) {
            // Item exists - UPDATE with QB data but adjust picking quantity for quantity changes
            const oldOriginalQty = existingProgress.originalQuantity.toNumber();
            const newOriginalQty = roundQuantity(item.originalQty);
            const oldPickingQty = existingProgress.pickingQuantity.toNumber();
            
            // Calculate the quantity difference
            const qtyDifference = newOriginalQty - oldOriginalQty;
            
            // Adjust picking quantity by the same difference
            // This ensures if original goes from 1→2, picking also goes from 1→2
            const newPickingQty = Math.max(0, oldPickingQty + qtyDifference);
            
            // If item was completed but now has remaining quantity, reset to pending
            let newPickingStatus = existingProgress.pickingStatus;
            if (newPickingQty > 0 && existingProgress.pickingStatus === 'completed') {
              newPickingStatus = 'pending';
            }
            
            await tx.quoteItem.update({
              where: {
                quoteId_productId: {
                  quoteId: quote.quoteId,
                  productId: BigInt(productId),
                },
              },
              data: {
                // Update from QuickBooks
                productName: item.productName,
                originalQuantity: newOriginalQty,
                sku: item.sku,
                price: roundQuantity(item.price),
                taxCodeRef: item.tax_code_ref,
                // Adjust picking quantity by the same amount as original quantity changed
                pickingQuantity: newPickingQty,
                pickingStatus: newPickingStatus,
              },
            });
          } else {
            // Item is NEW - CREATE it
            await tx.quoteItem.create({
              data: {
                quoteId: quote.quoteId,
                productId: Number(productId),
                productName: item.productName,
                pickingQuantity: roundQuantity(item.pickingQty),
                originalQuantity: roundQuantity(item.originalQty),
                pickingStatus: item.pickingStatus,
                sku: item.sku,
                price: roundQuantity(item.price),
                taxCodeRef: item.tax_code_ref,
              },
            });
            console.log(`➕ Added new item: ${item.productName} to quote ${quote.quoteId}`);
          }
        }
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred while saving the estimate to the database.');
  }
}

export async function checkQuoteExists(quoteId: string): Promise<boolean> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { id: true },
    });
    return quote !== null;
  } catch (error: unknown) {
    console.error('Error checking if quote exists:', error);
    throw error;
  }
}

export async function fetchQuoteData(quoteId: string): Promise<FilteredQuote | null> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteItems: {
          include: {
            product: true,
          },
        },
        customer: {
          select: { customerName: true },
        },
      },
    });

    if (!quote) {
      return null;
    }

    const formattedTime = formatTimestampForSydney(quote.updatedAt);
    const filteredQuote: FilteredQuote = {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber || '',
      customerId: quote.customerId,
      customerName: quote.customer.customerName,
      totalAmount: quote.totalAmount.toNumber(),
      orderStatus: quote.status,
      lastModified: formattedTime,
      productInfo: {},
      companyId: quote.companyId,
      orderNote: quote.orderNote,
      pickerNote: quote.pickerNote,
      externalSyncUrl: quote.externalSyncUrl,
      preparerNames: quote.preparerNames,
    };

    quote.quoteItems.forEach((item: any) => {
      filteredQuote.productInfo[item.productId.toString()] = {
        productId: Number(item.productId),
        productName: item.productName,
        originalQty: item.originalQuantity.toNumber(),
        pickingQty: item.pickingQuantity.toNumber(),
        pickingStatus: item.pickingStatus,
        sku: item.sku,
        price: item.price.toNumber(),
        companyId: quote.companyId,
        barcode: item.product.barcode || '',
        tax_code_ref: item.taxCodeRef,
        quantityOnHand: item.product.quantityOnHand.toNumber(),
      };
    });

    return filteredQuote;
  } catch (error: unknown) {
    console.error('Error fetching quote data:', error);
    throw error;
  }
}

async function updateQuotePreparerNames(quoteId: string, userName: string): Promise<void> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { preparerNames: true },
    });

    const currentNames = quote?.preparerNames
      ? quote.preparerNames.split(',').map((name: string) => name.trim().toLowerCase())
      : [];

    const normalizedNewName = userName.trim().toLowerCase();

    if (!currentNames.includes(normalizedNewName)) {
      currentNames.push(normalizedNewName);
      currentNames.sort();

      const updatedNamesString = currentNames.join(', ');

      await prisma.quote.update({
        where: { id: quoteId },
        data: { preparerNames: updatedNamesString },
      });
      console.log(`Quote ${quoteId}: Preparer names updated to "${updatedNamesString}" by ${userName}`);
    }
  } catch (err: unknown) {
    console.error(`Error updating preparer names for quote ${quoteId} by user ${userName}:`, err);
    throw new Error('Failed to update quote preparer names.');
  }
}

/**
 * Sets the pickingStartedAt timestamp for a quote if it hasn't been set yet.
 * This tracks when picking actually began (first barcode scan on the quote).
 * Note: Does NOT trigger on admin actions like adding/adjusting products.
 */
async function ensurePickingStartedTimestamp(quoteId: string): Promise<void> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { pickingStartedAt: true, status: true },
    });

    // Only set if not already set
    if (quote && !quote.pickingStartedAt) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { 
          pickingStartedAt: new Date(),
          // Change status to 'preparing' on first scan (if currently 'pending' or 'assigned')
          status: ['pending', 'assigned'].includes(quote.status) ? 'preparing' : quote.status
        },
      });
      console.log(`Quote ${quoteId}: Picking started - timestamp set and status updated to 'preparing'`);
    }
  } catch (error: unknown) {
    console.error(`Failed to set picking started timestamp for quote ${quoteId}:`, error);
    // Don't throw - this shouldn't block the main operation
  }
}

export async function processBarcode(barcode: string, quoteId: string, newQty: number, userName: string): Promise<BarcodeProcessResult> {
  // First, find the quote item by barcode through the product relation
  const quoteItem = await prisma.quoteItem.findFirst({
    where: {
      quoteId: quoteId,
      product: {
        barcode: barcode,
      },
    },
    include: {
      product: true,
    },
  });

  if (!quoteItem) {
    throw new InputError('This product is not included in this quote.');
  }

  const currentStatus = quoteItem.pickingStatus;
  
  if (currentStatus === 'completed') {
    throw new InputError('This product has already been fully picked.');
  } else if (currentStatus !== 'pending') {
    throw new InputError(`Cannot process item. Current status is ${currentStatus}. Please change the status to 'pending' before scanning.`);
  }

  // Calculate new picking quantity and status
  const newPickingQuantity = Math.max(quoteItem.pickingQuantity.toNumber() - newQty, 0);
  const newPickingStatus = newPickingQuantity <= 0 ? 'completed' : quoteItem.pickingStatus;

  const updatedItem = await prisma.quoteItem.update({
    where: {
      quoteId_productId: {
        quoteId: quoteId,
        productId: quoteItem.productId,
      },
    },
    data: {
      pickingQuantity: newPickingQuantity,
      pickingStatus: newPickingStatus as PickingStatus,
    },
  });

  // Explicitly update the quote's updatedAt timestamp to track active picking duration
  await prisma.quote.update({
    where: { id: quoteId },
    data: { updatedAt: new Date() }
  });

  await updateQuotePreparerNames(quoteId, userName);
  await ensurePickingStartedTimestamp(quoteId);

  return {
    productName: updatedItem.productName,
    updatedQty: updatedItem.pickingQuantity.toNumber(),
    pickingStatus: updatedItem.pickingStatus,
  };
}

export async function addProductToQuote(productId: number, quoteId: string, qty: number, _companyId: string): Promise<AddProductResult> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new AccessError('Product does not exist in database!');
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { totalAmount: true },
    });
    if (!quote) {
      throw new AccessError('Quote does not exist in database!');
    }

    let addNewProduct: Record<string, unknown> | null = null;
    let addExistingProduct: Record<string, unknown> | null = null;
    let totalAmount: Record<string, unknown> | null = null;

    await prisma.$transaction(async (tx: any) => {
      const pickingStatus = 'pending';
      const existingItem = await tx.quoteItem.findUnique({
        where: {
          quoteId_productId: {
            quoteId: quoteId,
            productId: productId,
          },
        },
      });
      
      if (existingItem) {
        addExistingProduct = await tx.quoteItem.update({
          where: {
            quoteId_productId: {
              quoteId: quoteId,
              productId: productId,
            },
          },
          data: {
            pickingQuantity: existingItem.pickingQuantity.toNumber() + qty,
            originalQuantity: existingItem.originalQuantity.toNumber() + qty,
            pickingStatus: pickingStatus,
          },
        });
      } else {
        addNewProduct = await tx.quoteItem.create({
          data: {
            quoteId: quoteId,
            productId: productId,
            pickingQuantity: qty,
            originalQuantity: qty,
            pickingStatus: pickingStatus,
            productName: product.productName,
            sku: product.sku,
            price: product.price,
            taxCodeRef: product.taxCodeRef,
          },
        });
      }
      
      const price = product.price.toNumber() * qty;
      const newTotalAmount = quote.totalAmount.toNumber() + price;
      
      const updatedQuote = await tx.quote.update({
        where: { id: quoteId },
        data: { totalAmount: newTotalAmount },
        select: { totalAmount: true, updatedAt: true },
      });
      
      totalAmount = updatedQuote;
    });

    if (addNewProduct && totalAmount) {
      const totalAmountData = totalAmount as { totalAmount: Decimal; updatedAt: Date };
      const newProduct = addNewProduct as {
        quoteId: string;
        productId: number;
        productName: string;
        originalQuantity: Decimal;
        pickingQuantity: Decimal;
        pickingStatus: string;
        sku: string;
        price: Decimal;
        companyId?: string;
        barcode?: string | null;
        taxCodeRef?: string | null;
      };
      return {
        status: 'new',
        productInfo: {
          quote_id: newProduct.quoteId,
          product_id: Number(newProduct.productId),
          product_name: newProduct.productName,
          original_quantity: newProduct.originalQuantity.toString(),
          picking_quantity: newProduct.pickingQuantity.toString(),
          picking_status: newProduct.pickingStatus as PickingStatus,
          sku: newProduct.sku,
          price: newProduct.price.toString(),
          company_id: newProduct.companyId || '',
          barcode: newProduct.barcode || null,
          tax_code_ref: newProduct.taxCodeRef || null,
        },
        totalAmount: totalAmountData.totalAmount.toString(),
        lastModified: totalAmountData.updatedAt,
      };
    } else if (addExistingProduct && totalAmount) {
      const totalAmountData = totalAmount as { totalAmount: Decimal };
      const existingProduct = addExistingProduct as {
        quoteId: string;
        productId: number;
        productName: string;
        originalQuantity: Decimal;
        pickingQuantity: Decimal;
        pickingStatus: string;
        sku: string;
        price: Decimal;
        companyId?: string;
        barcode?: string | null;
        taxCodeRef?: string | null;
      };
      return {
        status: 'exists',
        productInfo: {
          quote_id: existingProduct.quoteId,
          product_id: Number(existingProduct.productId),
          product_name: existingProduct.productName,
          original_quantity: existingProduct.originalQuantity.toString(),
          picking_quantity: existingProduct.pickingQuantity.toString(),
          picking_status: existingProduct.pickingStatus as PickingStatus,
          sku: existingProduct.sku,
          price: existingProduct.price.toString(),
          company_id: existingProduct.companyId || '',
          barcode: existingProduct.barcode || null,
          tax_code_ref: existingProduct.taxCodeRef || null,
        },
        totalAmount: totalAmountData.totalAmount.toString(),
      };
    } else {
      throw new AccessError('Failed to add product to quote');
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new AccessError(e.message);
    }
    throw new AccessError('An unknown error occurred while adding a product to the quote.');
  }
}

export async function adjustProductQuantity(quoteId: string, productId: number, newQty: number): Promise<AdjustQuantityResult> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { totalAmount: true },
    });

    if (!quote) {
      throw new AccessError('Quote does not exist!');
    }

    const quoteItem = await prisma.quoteItem.findUnique({
      where: {
        quoteId_productId: {
          quoteId: quoteId,
          productId: productId,
        },
      },
      select: { originalQuantity: true },
    });

    if (!quoteItem) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { price: true },
    });

    if (!product) {
      throw new AccessError('Product not found!');
    }

    const qtyDiff = newQty - quoteItem.originalQuantity.toNumber();
    const priceChange = product.price.toNumber() * qtyDiff;
    const newTotalAmount = quote.totalAmount.toNumber() + priceChange;

    const updatedItem = await prisma.quoteItem.update({
      where: {
        quoteId_productId: {
          quoteId: quoteId,
          productId: productId,
        },
      },
      data: {
        pickingQuantity: newQty,
        originalQuantity: newQty,
      },
      select: {
        pickingQuantity: true,
        originalQuantity: true,
      },
    });

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: { totalAmount: newTotalAmount },
      select: { totalAmount: true },
    });

    return {
      pickingQty: updatedItem.pickingQuantity.toNumber(),
      originalQty: updatedItem.originalQuantity.toNumber(),
      totalAmount: updatedQuote.totalAmount.toString(),
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred while adjusting product quantity.');
  }
}

export async function setOrderStatus(quoteId: string, newStatus: OrderStatus): Promise<{ orderStatus: OrderStatus }> {
  try {
    // If we're setting the status to 'checking' or 'completed', set the completion timestamp
    // This ensures we capture the time when picking was finished
    if (['checking', 'completed'].includes(newStatus)) {
      // Check if timestamp is already set to avoid overwriting
      const currentQuote = await prisma.quote.findUnique({
        where: { id: quoteId },
        select: { pickingCompletedAt: true }
      });

      if (currentQuote && !currentQuote.pickingCompletedAt) {
        await prisma.quote.update({
          where: { id: quoteId },
          data: { pickingCompletedAt: new Date() }
        });
      }
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: newStatus },
      select: { status: true },
    });
    return { orderStatus: updatedQuote.status };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred while setting the order status.');
  }
}

export async function getQuotesWithStatus(status: OrderStatus | 'all', companyId: string): Promise<Array<Record<string, unknown>>> {
  try {
    const quotes = await prisma.quote.findMany({
      where: status === 'all' ? { companyId } : { status, companyId },
      include: {
        customer: {
          select: { customerName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return quotes.map((quote: any) => {
      let timeTaken = 'N/A';
      // Use pickingStartedAt if available, otherwise fall back to createdAt
      const startTime = quote.pickingStartedAt || quote.createdAt;
      
      // Use pickingCompletedAt if available (new accurate method)
      // Otherwise fall back to updatedAt (legacy method)
      let endTime = (quote as any).pickingCompletedAt ? new Date((quote as any).pickingCompletedAt) : new Date(quote.updatedAt);
      
      // If the order is still in progress (not checking/completed) and no completion time is set,
      // we might want to show "In Progress" or calculate duration so far.
      // But for now, let's stick to calculating duration based on endTime.
      
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = endTime;
        
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

      const formattedTimeStarted = formatTimestampForSydney(startTime);
      const formattedLastModified = formatTimestampForSydney(quote.updatedAt);
      const formattedCreatedAt = formatTimestampForSydney(quote.createdAt);

      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber || '',
        customerId: quote.customerId,
        customerName: quote.customer.customerName,
        totalAmount: quote.totalAmount.toNumber(),
        orderStatus: quote.status,
        timeStarted: formattedTimeStarted,
        lastModified: formattedLastModified,
        createdAt: formattedCreatedAt,
        timeTaken: timeTaken,
        companyId: quote.companyId,
        preparerNames: quote.preparerNames,
        pickerNote: quote.pickerNote,
        externalSyncUrl: quote.externalSyncUrl,
      };
    });
  } catch (error: unknown) {
    console.error('Error fetching quotes with status:', error);
    if (error instanceof Error) {
      throw new AccessError('Failed to fetch quotes');
    }
    throw new AccessError('An unknown error occurred while fetching quotes with status.');
  }
}

export async function savePickerNote(quoteId: string, note: string): Promise<{ pickerNote: string }> {
  try {
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: { pickerNote: note },
      select: { pickerNote: true },
    });
    
    return { pickerNote: updatedQuote.pickerNote || '' };
  } catch (error: unknown) {
    if (error instanceof Object && 'code' in error && error.code === 'P2025') {
      // Prisma error for record not found
      throw new InputError('Quote not found');
    }
    if (error instanceof InputError) {
      throw error;
    }
    throw new InputError('Failed to save picker note');
  }
}

export async function deleteQuotesBulk(quoteIds: string[]): Promise<BulkDeleteResult> {
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const deletedQuotes: { id: string }[] = [];
      const errors: { quoteId: string, error: string }[] = [];
      
      for (const quoteId of quoteIds) {
        try {
          const quoteExists = await tx.quote.findUnique({
            where: { id: quoteId },
            select: { id: true },
          });
          
          if (!quoteExists) {
            errors.push({ quoteId, error: 'Quote not found' });
            continue;
          }
          
          // Delete quote items first (due to foreign key constraints)
          await tx.quoteItem.deleteMany({
            where: { quoteId: quoteId },
          });
          
          // Delete the quote
          const deletedQuote = await tx.quote.delete({
            where: { id: quoteId },
            select: { id: true },
          });
          
          deletedQuotes.push(deletedQuote);
          
        } catch (error: unknown) {
          if (error instanceof Error) {
            errors.push({ quoteId, error: error.message });
          } else {
            errors.push({ quoteId, error: 'An unknown error occurred' });
          }
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
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new InputError(`Bulk delete operation failed: ${error.message}`);
    }
    throw new InputError('An unknown error occurred during bulk delete.');
  }
}

export async function updateQuoteInAccountingService(quoteId: string, quoteLocalDb: FilteredQuote, rawQuoteData: Record<string, unknown>, companyId: string, connectionType: ConnectionType): Promise<{ message: string; redirectUrl?: string }> {
  if (connectionType === 'qbo') {
    return await updateQuoteInQuickBooks(quoteId, quoteLocalDb, rawQuoteData, companyId);
  } else if (connectionType === 'xero') {
    return await updateQuoteInXero(quoteId, quoteLocalDb, rawQuoteData, companyId);
  } else {
    throw new InputError(`Unsupported connection type: ${connectionType}`);
  }
}

async function updateQuoteInQuickBooks(quoteId: string, quoteLocalDb: FilteredQuote, rawQuoteData: Record<string, unknown>, companyId: string): Promise<{ message: string; redirectUrl?: string }> {
  try {
    const oauthClient = await getOAuthClient(companyId, 'qbo') as IntuitOAuthClient;
    
    const queryResponse = rawQuoteData.QueryResponse as Record<string, unknown>;
    const estimates = queryResponse.Estimate as Array<Record<string, unknown>>;
    const qbQuote = estimates[0];
    
    if (!qbQuote || !qbQuote.SyncToken) {
      throw new InputError('Invalid QuickBooks quote data or missing SyncToken');
    }
    
    const updatePayload: Record<string, unknown> = {
      Id: quoteId,
      SyncToken: qbQuote.SyncToken,
      sparse: false,
      Line: []
    };
    
    if (!updatePayload.sparse) {
      updatePayload.CustomerRef = qbQuote.CustomerRef;
      updatePayload.TxnDate = qbQuote.TxnDate;
      updatePayload.DocNumber = qbQuote.DocNumber;
    }

    // =========================================================
    // STEP 1: FILL THE BUCKETS (Map Local Inventory)
    // =========================================================
    interface ProductBucket {
      totalPickedQty: number;
      localItem: any;
      externalId: string;
    }

    const productBuckets = new Map<string, ProductBucket>();

    for (const localItem of Object.values(quoteLocalDb.productInfo)) {
      if (localItem.pickingStatus === 'pending') throw new InputError('Quote must not have any products pending!');
      if (localItem.pickingStatus === 'unavailable') continue; 

      const externalId = await productIdToExternalId(localItem.productId);
      
      if (externalId) {
        productBuckets.set(externalId, {
          totalPickedQty: Number(localItem.originalQty),
          localItem: localItem,
          externalId: externalId
        });
      }
    }

    // =========================================================
    // STEP 2: PROCESS EXISTING LINES (Preserve Structure)
    // =========================================================
    
    const lineItems: Array<Record<string, unknown>> = [];
    const originalQbLines = qbQuote.Line as Array<Record<string, unknown>>;


    // Count occurrences of each product to identify single lines vs duplicates
    const productLineCounts = new Map<string, number>();
    for (const line of originalQbLines) {
      if (line.DetailType === 'SalesItemLineDetail') {
        const salesDetail = line.SalesItemLineDetail as Record<string, unknown>;
        const itemRef = salesDetail.ItemRef as Record<string, unknown>;
        const externalId = itemRef.value as string;
        productLineCounts.set(externalId, (productLineCounts.get(externalId) || 0) + 1);
      }
    }

    for (const line of originalQbLines) {


      if (line.DetailType !== 'SalesItemLineDetail') {
        lineItems.push(line);
        continue;

      }

      const salesDetail = line.SalesItemLineDetail as Record<string, unknown>;
      const itemRef = salesDetail.ItemRef as Record<string, unknown>;
      const externalId = itemRef.value as string;

      const bucket = productBuckets.get(externalId);

      // If item no longer exists locally (or fully unavailable), skip this line (deletes it from QB)
      if (!bucket || bucket.totalPickedQty <= 0) {
        continue;
      }

      const lineCount = productLineCounts.get(externalId) || 0;
      let qtyToFulfill = 0;
      let currentLinePrice = Number(salesDetail.UnitPrice);

      if (lineCount === 1) {
        // SCENARIO 1: SINGLE LINE (Unique Product in QB)
        // If the product exists as a SINGLE line in QB, we simply update that line
        // with the TOTAL picked quantity. We do NOT split it.
        qtyToFulfill = bucket.totalPickedQty; 
      } else {
        // SCENARIO 2: DUPLICATE LINES (e.g. "Buy one get one free" existing as separate lines)
        // We must respect the original structure. Fill this line up to its original max,
        // and let the overflow go to the next line or a new line.
        const originalLineQty = Number(salesDetail.Qty || 0);
        if (bucket.totalPickedQty >= originalLineQty) {
          qtyToFulfill = originalLineQty;
        } else {
          qtyToFulfill = bucket.totalPickedQty; // Short pick
        }
      }

      bucket.totalPickedQty -= qtyToFulfill;

      const amount = currentLinePrice * qtyToFulfill;
      
      lineItems.push({
        Id: line.Id, // KEEPS THE LINE "ALIVE" IN QB
        Description: line.Description,
        Amount: amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ...salesDetail,
          Qty: qtyToFulfill,
          UnitPrice: currentLinePrice 
        }
      });
    }

    // =========================================================
    // STEP 3: PROCESS NEW/LEFTOVER ITEMS (Additions)
    // =========================================================
    // Iterate through buckets to check for leftovers.
    // This catches:
    // 1. Completely new items added locally.
    // 2. Extra quantity that exceeded the original QB lines.

    for (const [externalId, bucket] of productBuckets) {
      if (bucket.totalPickedQty > 0) {
        console.log(`Adding new line for ${bucket.localItem.productName} (Qty: ${bucket.totalPickedQty})`);

        // Since this is a new line, we MUST use the Local DB Price
        const localPrice = Number(bucket.localItem.price);
        const amount = localPrice * bucket.totalPickedQty;


        const newLine = {
          // No 'Id' field -> Tells QB to create a NEW line
          Description: bucket.localItem.productName,
          Amount: amount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: {
              value: externalId,
              name: bucket.localItem.productName
            },
            Qty: bucket.totalPickedQty,
            UnitPrice: localPrice,
            TaxCodeRef: {
              value: bucket.localItem.tax_code_ref || "4" // Ensure tax code is handled
            }
          }
        };

        lineItems.push(newLine);
      }
    }

    // =========================================================
    // FINALIZATION
    // =========================================================


    if (lineItems.length === 0) { 
      throw new InputError('No products found to update in QuickBooks');
    }
    
    updatePayload.Line = lineItems;

    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);
    
    // API Call
    let response;
    try {
      response = await oauthClient.makeApiCall({
        url: `${baseURL}v3/company/${realmId}/estimate?operation=update&minorversion=75`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
    } catch (apiError: unknown) {
      const error = apiError as { message?: string; response?: { data?: { Fault?: { Error?: Array<{ Message?: string }> } } } };
      const errorMsg = error.response?.data?.Fault?.Error?.[0]?.Message || error.message || 'Unknown error';
      throw new Error(`Failed to update quote in QuickBooks: ${errorMsg}`);
    }
    
    if (response.json?.Fault) {
      throw new Error(`QuickBooks error: ${response.json.Fault.Error[0].Message}`);
    }

    // Construct URL and Update DB
    const webUrl = baseURL.includes('sandbox') ? 'https://sandbox.qbo.intuit.com/app/' : 'https://qbo.intuit.com/app/';
    const quickbooksUrl = `${webUrl}estimate?txnId=${quoteId}`;
    
    await prisma.$transaction(async (tx: any) => {
      const currentQuote = await tx.quote.findUnique({
        where: { id: quoteId },
        select: { pickingCompletedAt: true }
      });
      
      const updateData: any = { 
        status: 'completed',
        externalSyncUrl: quickbooksUrl 
      };

      if (!currentQuote?.pickingCompletedAt) {
        updateData.pickingCompletedAt = new Date();
      }

      await tx.quote.update({
        where: { id: quoteId },
        data: updateData
      });
    });
    
    return { 
      message: 'Quote updated successfully in QuickBooks',
      redirectUrl: quickbooksUrl
    };

  } catch (error: unknown) {
    console.error('Error updating quote in QuickBooks:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function updateQuoteInXero(quoteId: string, quoteLocalDb: FilteredQuote, rawQuoteData: Record<string, unknown>, companyId: string): Promise<{ message: string; redirectUrl?: string }> {
  try {
    const oauthClient = await getOAuthClient(companyId, 'xero') as XeroClient;
    const { tenantId, shortCode } = await authSystem.getXeroTenantId(oauthClient);
    
    // Get the existing Xero quote
    const xeroQuote = rawQuoteData as XeroQuote;
    if (!xeroQuote || !xeroQuote.quoteID) {
      throw new InputError('Invalid Xero quote data or missing quoteID');
    }
    
    // Prepare line items for Xero
    const lineItems: Array<{
      description: string;
      quantity: number;
      unitAmount: number;
      accountCode: string;
      itemCode: string;
      taxType: string;
    }> = [];
    
    // Sort products by SKU before processing
    const sortedProducts = Object.values(quoteLocalDb.productInfo).sort((a, b) => {
      return a.sku.localeCompare(b.sku);
    });
    
    for (const localItem of sortedProducts) {
      if (localItem.pickingStatus === 'unavailable') {
        continue;
      }
      
      if (localItem.pickingStatus === 'pending') {
        throw new InputError('Quote must not have any products pending!');
      }
      
      const lineItem = {
        description: localItem.productName,
        quantity: Number(localItem.originalQty),
        unitAmount: Number(localItem.price),
        accountCode: "200", // Default sales account - you may want to make this configurable
        itemCode: localItem.sku,
        taxType: localItem.tax_code_ref || "NONE"
      };
      
      lineItems.push(lineItem);
    }
    
    if (lineItems.length === 0) {
      throw new InputError('No products found to update in Xero');
    }

    // Update the quote using the correct Xero API method
    const updatedQuote = {
      quoteID: xeroQuote.quoteID,
      contact: {
        contactID: xeroQuote.contact?.contactID
      },
      lineItems: lineItems,
      date: xeroQuote.date
    };

    // Make API call with proper error handling
    try {
      await oauthClient.accountingApi.updateQuote(tenantId, xeroQuote.quoteID!, {
        quotes: [updatedQuote]
      });
    } catch (apiError: unknown) {
      const error = apiError as { message?: string; response?: { data?: { message?: string } } };
      console.error('Xero API Call Error:', error.message);
      console.error('Error response data:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`Failed to update quote in Xero: ${errorMsg}`);
    }
    
    // Construct the Xero URL if we have the shortCode and quote ID
    let xeroUrl: string | undefined;
    if (shortCode && xeroQuote.quoteID) {
      xeroUrl = `https://go.xero.com/app/${shortCode}/quotes/edit/${xeroQuote.quoteID}`;
      
      // Update status and save URL in a transaction
      await prisma.$transaction(async (tx: any) => {
        // Check if we need to set pickingCompletedAt
        const currentQuote = await tx.quote.findUnique({
          where: { id: quoteId },
          select: { pickingCompletedAt: true }
        });
        
        const updateData: any = { 
          status: 'completed',
          externalSyncUrl: xeroUrl 
        };

        if (!currentQuote?.pickingCompletedAt) {
          updateData.pickingCompletedAt = new Date();
        }

        await tx.quote.update({
          where: { id: quoteId },
          data: updateData
        });
        
        console.log(`Quote ${quoteId} completed and synced to Xero`);
      });
    } else {
      // If we don't have a URL, still update status
      await prisma.$transaction(async (tx: any) => {
        const currentQuote = await tx.quote.findUnique({
          where: { id: quoteId },
          select: { pickingCompletedAt: true }
        });
        
        const updateData: any = { status: 'completed' };

        if (!currentQuote?.pickingCompletedAt) {
          updateData.pickingCompletedAt = new Date();
        }

        await tx.quote.update({
          where: { id: quoteId },
          data: updateData
        });
      });
        
      console.log(`Quote ${quoteId} completed (no Xero URL available)`);
    }
    
    return { 
      message: 'Quote updated successfully in Xero',
      redirectUrl: xeroUrl
    };
  } catch (error: unknown) {
    console.error('Error updating quote in Xero:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(errorMessage);
  }
}

export async function ensureQuotesExistInDB(quoteIds: string[], companyId: string, connectionType: ConnectionType): Promise<void> {
    const quotesCheckResult = await prisma.quote.findMany({
        where: {
            id: { in: quoteIds },
        },
        select: { id: true },
    });
    const existingIds = new Set(quotesCheckResult.map((r: any) => r.id));

    const missingIds = quoteIds.filter(id => !existingIds.has(id));

    if (missingIds.length === 0) {
        console.log('All quotes already exist locally.');
        return;
    }

    console.log(`Fetching ${missingIds.length} missing quotes from ${connectionType === 'xero' ? 'Xero' : 'QuickBooks'}...`);

    const newQuotesData = await getEstimatesBulk(missingIds, companyId, connectionType);
    
    // Track successfully saved quotes and failed quotes
    const successfullySavedIds: string[] = [];
    const failedQuotes: { id: string; error: string; productName?: string }[] = [];

    for (const quote of newQuotesData) {
        if ((quote as QuoteFetchError).error) {
            // This quote failed to fetch
            const errorQuote = quote as QuoteFetchError;
            failedQuotes.push({
                id: errorQuote.quoteId,
                error: errorQuote.message,
                productName: errorQuote.productName
            });
        } else {
            // Try to save the quote to database
            try {
                await estimateToDB(quote as FilteredQuote);
                successfullySavedIds.push((quote as FilteredQuote).quoteId);
            } catch (error) {
                failedQuotes.push({
                    id: (quote as FilteredQuote).quoteId,
                    error: error instanceof Error ? error.message : 'Unknown error saving quote to database'
                });
            }
        }
    }

    // If any quotes failed, throw an error with details
    if (failedQuotes.length > 0) {
        const errorDetails = failedQuotes.map(f => {
            if (f.productName) {
                return `Quote ID ${f.id}: ${f.error} Missing product: ${f.productName}`;
            }
            return `Quote ID ${f.id}: ${f.error}`;
        }).join('; ');
        throw new InputError(
            `Failed to fetch or save ${failedQuotes.length} out of ${missingIds.length} quotes. Details: ${errorDetails}`
        );
    }

    console.log(`Successfully saved ${successfullySavedIds.length} new quotes to the database.`);
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
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new InputError(e.message);
        }
        throw new InputError('An unknown error occurred during bulk estimate fetch.');
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
                // Use direct API read instead of query
                const estimateResponse = await oauthClient.makeApiCall({
                    url: `${baseURL}v3/company/${realmId}/estimate/${quoteId}?minorversion=75`
                });
                
                // Construct response matching what filterEstimates expects (QueryResponse structure)
                const responseData = {
                    QueryResponse: {
                        Estimate: [estimateResponse.json.Estimate]
                    }
                };
                if (responseData.QueryResponse.Estimate && responseData.QueryResponse.Estimate.length > 0) {
                    const filteredQuote = await filterEstimates(responseData, companyId, 'qbo') as FilteredQuote | QuoteFetchError;
                    if (filteredQuote) {
                        allQuotes.push(filteredQuote);
                    }
                } else {
                    // Quote not found in QuickBooks
                    allQuotes.push({
                        error: true,
                        quoteId: quoteId,
                        message: 'Quote not found in QuickBooks',
                        productName: 'N/A',
                    });
                }
            } catch (individualError: unknown) {
                const errorMessage = individualError instanceof Error ? individualError.message : 'Unknown error';
                console.error(`Error fetching quote ${quoteId}:`, errorMessage);
                
                // Add QuoteFetchError to results instead of silently failing
                allQuotes.push({
                    error: true,
                    quoteId: quoteId,
                    message: errorMessage,
                    productName: 'N/A',
                });
            }
        }
        
        return allQuotes;
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new InputError(e.message);
        }
        throw new InputError('An unknown error occurred during bulk QBO estimate fetch.');
    }
}

async function getXeroEstimatesBulk(quoteIds: string[], companyId: string): Promise<(FilteredQuote | QuoteFetchError)[]> {
    try {
        const oauthClient = await getOAuthClient(companyId, 'xero') as XeroClient;

        const { tenantId } = await authSystem.getXeroTenantId(oauthClient);
        
        const allQuotes: (FilteredQuote | QuoteFetchError)[] = [];
        
        for (const quoteId of quoteIds) {
            try {
                const response = await oauthClient.accountingApi.getQuote(tenantId, quoteId);
                if (response.body.quotes && response.body.quotes.length > 0) {
                    const estimate = response.body.quotes[0];
                    const filteredQuote = await filterEstimates(estimate as Record<string, unknown>, companyId, 'xero') as FilteredQuote | QuoteFetchError;
                    if (filteredQuote) {
                        allQuotes.push(filteredQuote);
                    }
                } else {
                    // Quote not found in Xero
                    allQuotes.push({
                        error: true,
                        quoteId: quoteId,
                        message: 'Quote not found in Xero',
                        productName: 'N/A',
                    });
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Failed to fetch Xero quote ${quoteId}:`, errorMessage);
                
                // Add QuoteFetchError to results instead of silently failing
                allQuotes.push({
                    error: true,
                    quoteId: quoteId,
                    message: errorMessage,
                    productName: 'N/A',
                });
            }
        }

        return allQuotes;
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new InputError(e.message);
        }
        throw new InputError('An unknown error occurred during bulk Xero estimate fetch.');
    }
}

export async function getQuotesWithBackorders(companyId: string): Promise<Array<Record<string, unknown>>> {
  try {
    // Find all quotes that have at least one item with pickingStatus 'backorder'
    const quotesWithBackorders = await prisma.quote.findMany({
      where: {
        companyId,
        quoteItems: {
          some: {
            pickingStatus: 'backorder',
          },
        },
      },
      include: {
        customer: {
          select: {
            customerName: true,
          },
        },
        quoteItems: {
          where: {
            pickingStatus: 'backorder',
          },
          select: {
            productName: true,
            sku: true,
            pickingQuantity: true,
            originalQuantity: true,
            productId: true,
          },
        },
        runItems: {
          include: {
            run: {
              select: {
                id: true,
                runNumber: true,
                runName: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return quotesWithBackorders.map((quote: any) => ({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customer.customerName,
      customerId: quote.customerId,
      orderStatus: quote.status,
      totalAmount: Number(quote.totalAmount),
      lastModified: formatTimestampForSydney(quote.updatedAt),
      backorderItems: quote.quoteItems.map((item: any) => ({
        productId: Number(item.productId),
        productName: item.productName,
        sku: item.sku,
        pickingQuantity: Number(item.pickingQuantity),
        originalQuantity: Number(item.originalQuantity),
      })),
      runs: quote.runItems.map((runItem: any) => ({
        runId: runItem.run.id,
        runNumber: Number(runItem.run.runNumber),
        runName: runItem.run.runName,
        runStatus: runItem.run.status,
        priority: runItem.priority,
      })),
    }));
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new InputError('Failed to fetch quotes with backorders: ' + error.message);
    }
    throw new InputError('An unknown error occurred while fetching quotes with backorders.');
  }
}
