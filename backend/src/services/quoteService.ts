import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { roundQuantity, formatTimestampForSydney } from '../helpers.js';
import { getOAuthClient, getBaseURL, getRealmId } from './authService.js';
import { getProductsFromDBByIds, productIdToExternalId } from './productService.js';
import { tokenService } from './tokenService.js';
import { authSystem } from './authSystem.js';
import { ConnectionType } from '../types/auth.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient, Quote as XeroQuote, LineItem as XeroLineItem, Contact as XeroContact } from 'xero-node';
import { Product, PickingStatus } from '../types/product.js';
import { prisma } from '../lib/prisma.js';
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
    await prisma.$transaction(async (tx) => {
      // Upsert the quote
      await tx.quote.upsert({
        where: { id: quote.quoteId },
        update: {
          totalAmount: quote.totalAmount,
          status: quote.orderStatus,
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

      // Delete existing quote items
      await tx.quoteItem.deleteMany({
        where: { quoteId: quote.quoteId },
      });

      // Create new quote items
      for (const [productId, item] of Object.entries(quote.productInfo)) {
        await tx.quoteItem.create({
          data: {
            quoteId: quote.quoteId,
            productId: Number(productId), // Convert string to number for bigint field
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
    });
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function checkQuoteExists(quoteId: string): Promise<boolean> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: { id: true },
    });
    return quote !== null;
  } catch (error: any) {
    console.error('Error checking if quote exists:', error);
    throw error;
  }
}

export async function fetchQuoteData(quoteId: string): Promise<FilteredQuote | null> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteItems: true,
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
    };

    quote.quoteItems.forEach(item => {
      filteredQuote.productInfo[item.productId.toString()] = {
        productId: Number(item.productId),
        productName: item.productName,
        originalQty: item.originalQuantity.toNumber(),
        pickingQty: item.pickingQuantity.toNumber(),
        pickingStatus: item.pickingStatus,
        sku: item.sku,
        price: item.price.toNumber(),
        companyId: quote.companyId,
        barcode: '', // Will be populated from product relation if needed
        tax_code_ref: item.taxCodeRef,
        quantityOnHand: 0,
      };
    });

    return filteredQuote;
  } catch (error: any) {
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
      ? quote.preparerNames.split(',').map(name => name.trim().toLowerCase())
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
  } catch (err: any) {
    console.error(`Error updating preparer names for quote ${quoteId} by user ${userName}:`, err);
    throw new Error('Failed to update quote preparer names.');
  }
}

export async function processBarcode(barcode: string, quoteId: string, newQty: number, userName: string): Promise<BarcodeProcessResult> {
  try {
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
      throw new InputError('Quote number is invalid or scanned product does not exist on quote');
    }

    const currentStatus = quoteItem.pickingStatus;
    
    if (currentStatus === 'completed') {
      throw new InputError(`This item has already been fully picked`);
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

    await updateQuotePreparerNames(quoteId, userName);

    return {
      productName: updatedItem.productName,
      updatedQty: updatedItem.pickingQuantity.toNumber(),
      pickingStatus: updatedItem.pickingStatus,
    };
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function addProductToQuote(productId: number, quoteId: string, qty: number, companyId: string): Promise<AddProductResult> {
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

    let addNewProduct: any = null;
    let addExistingProduct: any = null;
    let totalAmount: any = 0;

    await prisma.$transaction(async (tx) => {
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

    if (addNewProduct) {
      return {
        status: 'new',
        productInfo: addNewProduct,
        totalAmount: totalAmount.totalAmount.toNumber(),
        lastModified: totalAmount.updatedAt,
      };
    } else {
      return {
        status: 'exists',
        productInfo: addExistingProduct,
        totalAmount: totalAmount.totalAmount.toNumber(),
      };
    }
  } catch (e: any) {
    throw new AccessError(e.message);
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
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function setOrderStatus(quoteId: string, newStatus: OrderStatus): Promise<{ orderStatus: OrderStatus }> {
  try {
    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: newStatus },
      select: { status: true },
    });
    return { orderStatus: updatedQuote.status };
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function getQuotesWithStatus(status: OrderStatus | 'all'): Promise<any[]> {
  try {
    const quotes = await prisma.quote.findMany({
      where: status === 'all' ? {} : { status },
      include: {
        customer: {
          select: { customerName: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return quotes.map(quote => {
      let timeTaken = 'N/A';
      if (quote.createdAt && quote.updatedAt) {
        const start = new Date(quote.createdAt);
        const end = new Date(quote.updatedAt);
        
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

      const formattedTimeStarted = formatTimestampForSydney(quote.createdAt);
      const formattedLastModified = formatTimestampForSydney(quote.updatedAt);

      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber || '',
        customerId: quote.customerId,
        customerName: quote.customer.customerName,
        totalAmount: quote.totalAmount.toNumber(),
        orderStatus: quote.status,
        timeStarted: formattedTimeStarted,
        lastModified: formattedLastModified,
        timeTaken: timeTaken,
        companyId: quote.companyId,
        preparerNames: quote.preparerNames,
        pickerNote: quote.pickerNote,
      };
    });
  } catch (error: any) {
    console.error('Error fetching quotes with status:', error);
    throw new AccessError('Failed to fetch quotes');
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
  } catch (error: any) {
    if (error.code === 'P2025') {
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
    const result = await prisma.$transaction(async (tx) => {
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
    const quotesCheckResult = await prisma.quote.findMany({
        where: {
            id: { in: quoteIds },
        },
        select: { id: true },
    });
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
