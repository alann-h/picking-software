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

    const queryStr = `SELECT * FROM estimate WHERE CustomerRef = '${customerId}'`;
    const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;
    
    const response = await oauthClient.makeApiCall({ url });
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
    }));

  } catch (error: unknown) {
    console.error('Error fetching Xero customer quotes:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Xero customer quotes: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching Xero customer quotes.');
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
    
    const queryStr = `SELECT * FROM estimate WHERE Id = '${quoteId}'`;

    const estimateResponse = await oauthClient.makeApiCall({
      url: `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`
    });
    return estimateResponse.json;
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

async function filterQboEstimate(estimate: Record<string, unknown>, companyId: string, connectionType: ConnectionType): Promise<FilteredQuote | QuoteFetchError> {
  const estimateLine = estimate.Line as Array<Record<string, unknown>>;
  const itemIds = estimateLine
    .filter((line: Record<string, unknown>) => {
      if (line.DetailType === 'SubTotalLineDetail' || line.DetailType === 'TaxLineDetail') {
        return false;
      }
      const amount = line.Amount as number;
      if (amount && amount < 0) {
        return false;
      }
      const salesItemLineDetail = line.SalesItemLineDetail as Record<string, unknown>;
      const itemRef = salesItemLineDetail.ItemRef as Record<string, unknown>;
      const itemId = itemRef.value as string;
      if (itemId === 'SHIPPING_ITEM_ID') {
        return false;
      }
      return true;
    })
    .map((line: Record<string, unknown>) => {
      const salesItemLineDetail = line.SalesItemLineDetail as Record<string, unknown>;
      const itemRef = salesItemLineDetail.ItemRef as Record<string, unknown>;
      return itemRef.value as string;
    });
    
  const productsFromDB: Product[] = await getProductsFromDBByIds(itemIds, companyId); 
  const productMap = new Map(productsFromDB.map(p => [p.externalItemId, p]));
  const productInfo: Record<string, ProductInfo> = {};
   
  for (const line of estimateLine) {
    // Skip shipping items
    if (line.DetailType === 'SubTotalLineDetail' || line.DetailType === 'TaxLineDetail') {
      continue;
    }
    const amount = line.Amount as number;
    if (amount && amount < 0) {
      continue;
    }

    const salesItemLineDetail = line.SalesItemLineDetail as Record<string, unknown>;
    const itemRef = salesItemLineDetail.ItemRef as Record<string, unknown>;
    const itemId = itemRef.value as string;
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
    
    productInfo[itemLocal.id.toString()] = {
      productName: itemLocal.productName,
      productId: Number(itemLocal.id),
      sku: itemLocal.sku,
      pickingQty: (salesItemLineDetail.Qty as number) || 0,
      originalQty: (salesItemLineDetail.Qty as number) || 0,
      pickingStatus: 'pending',
      price: parseFloat(itemLocal.price.toString()),
      quantityOnHand: parseFloat(itemLocal.quantityOnHand.toString()),
      companyId,
      barcode: itemLocal.barcode,
      tax_code_ref: itemLocal.taxCodeRef
    };
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
      externalSyncUrl: null
    };
}

async function filterXeroEstimate(quote: XeroQuote, companyId: string, connectionType: ConnectionType): Promise<FilteredQuote | QuoteFetchError> {
  const lineItems = quote.lineItems || [];
  console.log('lineItems', lineItems);
  const skus = lineItems
    .filter(item => item.itemCode)
    .map(item => item.itemCode!);
  console.log('skus', skus);
  const productsFromDB: Product[] = await getProductsFromDBBySkus(skus, companyId); 
  const productMap = new Map(productsFromDB.map(p => [p.sku, p]));
  const productInfo: Record<string, ProductInfo> = {};
   
  for (const lineItem of lineItems) {
    if (!lineItem.itemCode) continue;

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
    externalSyncUrl: null
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
  } catch (err: unknown) {
    console.error(`Error updating preparer names for quote ${quoteId} by user ${userName}:`, err);
    throw new Error('Failed to update quote preparer names.');
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

  await updateQuotePreparerNames(quoteId, userName);

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
      sparse: true,
      Line: []
    };

    const lineItems: Array<Record<string, unknown>> = [];
    
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
      
      const amount = Number(localItem.price) * Number(localItem.originalQty);
      const externalId = await productIdToExternalId(localItem.productId);
      
      if (!externalId) {
        throw new InputError(`Product ${localItem.productName} not found in QuickBooks`);
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
      
      lineItems.push(lineItem);
    }
    
    updatePayload.Line = lineItems;
    if (lineItems.length === 0) {
      throw new InputError('No products found to update in QuickBooks');
    }

    const baseURL = await getBaseURL(oauthClient, 'qbo');
    const realmId = getRealmId(oauthClient);
    
    // Make API call with proper error handling
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
      console.error('QuickBooks API Call Error:', error.message);
      console.error('Error response data:', error.response?.data);
      const errorMsg = error.response?.data?.Fault?.Error?.[0]?.Message || error.message || 'Unknown error';
      throw new Error(`Failed to update quote in QuickBooks: ${errorMsg}`);
    }
    
    // Check if response contains a Fault
    if (response.json?.Fault) {
      const errorDetail = response.json.Fault.Error[0];
      throw new Error(`QuickBooks error: ${errorDetail.Message}`);
    }

    await setOrderStatus(quoteId, 'finalised');
    
    // Construct the QuickBooks URL using the estimate ID
    const webUrl = baseURL.includes('sandbox') 
      ? 'https://sandbox.qbo.intuit.com/app/'
      : 'https://qbo.intuit.com/app/';
    const quickbooksUrl = `${webUrl}estimate?txnId=${quoteId}`;
    
    // Save the URL to the database
    await prisma.quote.update({
      where: { id: quoteId },
      data: { externalSyncUrl: quickbooksUrl }
    });
    
    return { 
      message: 'Quote updated successfully in QuickBooks',
      redirectUrl: quickbooksUrl
    };
  } catch (error: unknown) {
    console.error('Error updating quote in QuickBooks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(errorMessage);
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

    await setOrderStatus(quoteId, 'finalised');
    
    // Construct the Xero URL if we have the shortCode and quote ID
    let xeroUrl: string | undefined;
    if (shortCode && xeroQuote.quoteID) {
      xeroUrl = `https://go.xero.com/app/${shortCode}/quotes/edit/${xeroQuote.quoteID}`;
      
      // Save the URL to the database
      await prisma.quote.update({
        where: { id: quoteId },
        data: { externalSyncUrl: xeroUrl }
      });
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
            } catch (individualError: unknown) {
                if (individualError instanceof Error) {
                    console.error(`Error fetching quote ${quoteId}:`, individualError.message);
                } else {
                    console.error(`An unknown error occurred while fetching quote ${quoteId}:`, individualError);
                }
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
        
        const estimates: XeroQuote[] = [];
        
        for (const quoteId of quoteIds) {
            try {
                const response = await oauthClient.accountingApi.getQuote(tenantId, quoteId);
                if (response.body.quotes && response.body.quotes.length > 0) {
                    estimates.push(response.body.quotes[0]);
                }
            } catch (error: unknown) {
                console.error(`Failed to fetch Xero quote ${quoteId}:`, error);
            }
        }

        if (estimates.length === 0) {
            return [];
        }

        const filteredQuotes: (FilteredQuote | QuoteFetchError)[] = [];
        for (const estimate of estimates) {
            try {
                const filteredQuote = await filterEstimates(estimate as Record<string, unknown>, companyId, 'xero') as FilteredQuote | QuoteFetchError;
                if (filteredQuote && !(filteredQuote as QuoteFetchError).error) {
                    filteredQuotes.push(filteredQuote);
                }
            } catch (error: unknown) {
                console.error(`Failed to filter Xero estimate:`, error);
            }
        }

        return filteredQuotes;
    } catch (e: unknown) {
        if (e instanceof Error) {
            throw new InputError(e.message);
        }
        throw new InputError('An unknown error occurred during bulk Xero estimate fetch.');
    }
}
