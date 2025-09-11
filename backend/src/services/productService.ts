import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { getBaseURL, getOAuthClient, getRealmId } from './authService.js';
import he from 'he';
import { authSystem } from './authSystem.js';
import {
  Product,
  ClientProduct,
  EnrichableProduct,
  EnrichedProduct,
  UpdateProductPayload,
  QuoteItemStatusResult,
  QuoteItemFinishResult,
  PickingStatus,
  NewProductData
} from '../types/product.js';
import { ConnectionType } from '../types/auth.js';
import { IntuitOAuthClient } from '../types/authSystem.js';
import { XeroClient, Item, Contact } from 'xero-node';
import { prisma } from '../lib/prisma.js';

export async function productIdToExternalId(productId: number): Promise<string> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { externalItemId: true },
    });

    if (!product || !product.externalItemId) {
      throw new AccessError(`No product found with id=${productId} or product has no external ID`);
    }

    return product.externalItemId;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new AccessError(err.message);
    }
    throw new AccessError('An unknown error occurred while converting product ID.');
  }
}

export async function enrichWithQBOData(products: EnrichableProduct[], companyId: string): Promise<EnrichedProduct[]> {
  try {
    const oauthClient = await getOAuthClient(companyId, 'qbo');
    const enriched: EnrichedProduct[] = [];

    for (const product of products) {
      try {
        const queryStr = `SELECT * FROM Item WHERE Sku = '${product.sku}'`;
        const baseURL = await getBaseURL(oauthClient, 'qbo');
        const realmId = getRealmId(oauthClient as IntuitOAuthClient);
        const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(queryStr)}&minorversion=75`;

        const response = await (oauthClient as IntuitOAuthClient).makeApiCall({ url });
        const itemData = response.json?.QueryResponse?.Item?.[0];

        if (!itemData || !itemData.Active) continue;

        const QtyOnHand = parseFloat(itemData.QtyOnHand);
        if (!isFinite(QtyOnHand)) {
          console.warn(`Invalid quantity for SKU ${product.sku}`);
          continue;
        }
        enriched.push({
          ...product,
          price: itemData.UnitPrice,
          quantity_on_hand: QtyOnHand,
          external_item_id: itemData.Id,
          tax_code_ref: itemData.SalesTaxCodeRef.value
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.warn(`Failed QBO lookup for SKU ${product.sku}: ${err.message}`);
        } else {
          console.warn(`Failed QBO lookup for SKU ${product.sku}: An unknown error occurred`);
        }
        enriched.push({
          ...product,
          price: Number(product.price) || 0,
          quantity_on_hand: Number(product.quantity_on_hand) || 0,
          external_item_id: null,
          tax_code_ref: null
        });
      }
    }

    return enriched;
  } catch (error: unknown) {
    console.error('Error enriching products with QBO data:', error);
    return products.map(product => ({
      ...product,
      price: Number(product.price) || 0,
      quantity_on_hand: Number(product.quantity_on_hand) || 0,
      external_item_id: null,
      tax_code_ref: null
    }));
  }
}

export async function enrichWithXeroData(products: EnrichableProduct[], companyId: string): Promise<EnrichedProduct[]> {
  try {
    const oauthClient = await getOAuthClient(companyId, 'xero');
    const enriched: EnrichedProduct[] = [];

    for (const product of products) {
      try {
        const tenantId = await authSystem.getXeroTenantId(oauthClient as XeroClient);
        
        const response = await (oauthClient as XeroClient).accountingApi.getItems(
          tenantId,
          undefined,
          `Code == "${product.sku}"`,
        );

        const items = response.body.items || [];
        const itemData = items[0];

        if (!itemData || !itemData.isSold) continue;

        let quantityOnHand = 0;
        if (itemData.isTrackedAsInventory && itemData.quantityOnHand !== undefined) {
          quantityOnHand = parseFloat(String(itemData.quantityOnHand));
          if (!isFinite(quantityOnHand)) {
            console.warn(`Invalid quantity for SKU ${product.sku}`);
            quantityOnHand = 0;
          }
        }

        const price = itemData.salesDetails?.unitPrice || 0;

        enriched.push({
          ...product,
          price: price,
          quantity_on_hand: quantityOnHand,
          external_item_id: itemData.itemID || null,
          tax_code_ref: itemData.salesDetails?.taxType || null
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.warn(`Failed Xero lookup for SKU ${product.sku}: ${err.message}`);
        } else {
          console.warn(`Failed Xero lookup for SKU ${product.sku}: An unknown error occurred`);
        }
        enriched.push({
          ...product,
          price: Number(product.price) || 0,
          quantity_on_hand: Number(product.quantity_on_hand) || 0,
          external_item_id: null,
          tax_code_ref: null
        });
      }
    }

    return enriched;
  } catch (error: unknown) {
    console.error('Error enriching products with Xero data:', error);
    return products.map(product => ({
      ...product,
      price: Number(product.price) || 0,
      quantity_on_hand: Number(product.quantity_on_hand) || 0,
      external_item_id: null,
      tax_code_ref: null
    }));
  }
}

export async function upsertProducts(products: EnrichableProduct[], companyId: string): Promise<number | undefined> {
  if (products.length === 0) {
    return 0;
  }

  // Deduplicate products by SKU to prevent conflicts, keeping the last one.
  const skuMap = new Map<string, EnrichableProduct>();
  products.forEach(product => {
    skuMap.set(product.sku, product);
  });
  const deduplicatedProducts = Array.from(skuMap.values());

  let processedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const product of deduplicatedProducts) {
      const productData = {
        companyId: companyId,
        productName: product.productName,
        sku: product.sku,
        barcode: product.barcode ?? null,
        externalItemId: product.external_item_id,
        category: product.category,
        taxCodeRef: product.tax_code_ref,
        price: product.price,
        quantityOnHand: product.quantity_on_hand,
        isArchived: product.is_archived ?? false,
      };

      // We need to handle the case where the SKU doesn't exist but the barcode might.
      // Prisma's `upsert` is based on a single unique key, so we'll do it manually.
      const existingBySku = await tx.product.findUnique({
        where: { companyId_sku: { companyId, sku: product.sku } },
      });

      if (existingBySku) {
        // If product with SKU exists, update it.
        await tx.product.update({
          where: { id: existingBySku.id },
          data: productData,
        });
      } else {
        let existingByBarcode = null;
        if (product.barcode && product.barcode.trim() !== '') {
          existingByBarcode = await tx.product.findFirst({
            where: { companyId, barcode: product.barcode },
          });
        }
        
        if (existingByBarcode) {
          // If product with barcode exists (but not SKU), update it.
           await tx.product.update({
            where: { id: existingByBarcode.id },
            data: productData,
          });
        } else {
          // If neither exists, create a new product.
          await tx.product.create({
            data: productData,
          });
        }
      }
      processedCount++;
    }
  });

  console.log(`✅ Successfully processed ${processedCount} products using Prisma transaction (${products.length - deduplicatedProducts.length} duplicates removed).`);
  return processedCount;
}

export async function getProductName(barcode: string, companyId: string): Promise<string> {
  try {
    const product = await prisma.product.findFirst({
      where: { barcode, companyId },
      select: { productName: true },
    });

    if (!product) {
      throw new InputError('This product does not exist within the database');
    }
    return product.productName;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred while getting the product name.');
  }
}

export async function getProductsFromDBByIds(itemIds: string[], companyId: string): Promise<Product[]> {
  if (!itemIds || itemIds.length === 0) {
    return [];
  }

  try {
    const results = await prisma.product.findMany({
      where: {
        externalItemId: { in: itemIds },
        companyId: companyId,
        isArchived: false,
      },
    });

    return results;
  } catch (err: unknown) {
    console.log(err);
    throw new AccessError('Error accessing the database while fetching products');
  }
}

export async function getAllProducts(companyId: string): Promise<ClientProduct[]> {
  try {
    const products = await prisma.product.findMany({
      where: { companyId },
    });

    return products.map((product) => ({
      productId: Number(product.id),
      productName: product.productName,
      barcode: product.barcode ?? '',
      sku: product.sku ?? '',
      price: product.price.toNumber(),
      quantityOnHand: product.quantityOnHand.toNumber(),
      companyId: product.companyId,
      category: product.category ?? null,
      externalItemId: product.externalItemId ?? '',
      isArchived: product.isArchived,
    }));
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred while fetching all products.');
  }
}

const fieldToDbColumnMap: { [key in keyof UpdateProductPayload]: keyof Product | null } = {
  productName: 'productName',
  price: 'price',
  barcode: 'barcode',
  quantityOnHand: 'quantityOnHand',
  sku: 'sku',
};

const fieldsToDecode: (keyof UpdateProductPayload)[] = ['productName', 'sku'];

export async function updateProductDb(productId: number, updateFields: UpdateProductPayload): Promise<Product> {
  const processedUpdateFields: any = {};

  // Use Object.entries for a fully type-safe iteration
  for (const [key, rawValue] of Object.entries(updateFields)) {
    const typedKey = key as keyof UpdateProductPayload;
    const dbColumnName = fieldToDbColumnMap[typedKey];
    let value = rawValue;

    if (fieldsToDecode.includes(typedKey) && typeof value === 'string') {
      value = he.decode(value);
    }

    if (dbColumnName) {
      processedUpdateFields[dbColumnName] = value;
    } else {
      console.warn(`Attempted to update unknown field "${key}". Skipping.`);
    }
  }

  if (Object.keys(processedUpdateFields).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  return prisma.product.update({
    where: { id: productId },
    data: processedUpdateFields,
  });
}

export async function setProductArchiveStatusDb(productId: number, isArchived: boolean): Promise<Product> {
  return prisma.product.update({
    where: { id: productId },
    data: { isArchived },
  });
}

export async function addProductDb(product: NewProductData[], companyId: string, connectionType: ConnectionType = 'qbo'): Promise<string> {
  try {
    let enrichedProduct;
    const enrichable = product.map(p => ({ ...p, productName: p.productName }));

    if (connectionType === 'qbo') {
      enrichedProduct = await enrichWithQBOData(enrichable, companyId);
    } else if (connectionType === 'xero') {
      enrichedProduct = await enrichWithXeroData(enrichable, companyId);
    } else {
      enrichedProduct = await enrichWithQBOData(enrichable, companyId); // Default to QBO
    }

    let { productName, barcode, sku } = product[0];
    if (productName) { productName = he.decode(productName); }
    if (sku) { sku = he.decode(sku); }

    const { price, quantity_on_hand, external_item_id, tax_code_ref } = enrichedProduct[0];
    
    const result = await prisma.product.upsert({
      where: {
        companyId_sku: {
          companyId: companyId,
          sku: sku,
        },
      },
      update: {
        productName: productName,
        barcode: barcode === '' ? null : barcode,
        externalItemId: external_item_id,
        category: null, // category is not in the original data
        taxCodeRef: tax_code_ref,
        price: price || 0,
        quantityOnHand: quantity_on_hand || 0,
        isArchived: false,
      },
      create: {
        companyId: companyId,
        productName: productName,
        sku: sku,
        barcode: barcode === '' ? null : barcode,
        externalItemId: external_item_id,
        category: null,
        taxCodeRef: tax_code_ref,
        price: price || 0,
        quantityOnHand: quantity_on_hand || 0,
        isArchived: false,
      },
    });

    return result.sku;

  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new InputError(`addProductDb failed: ${err.message}`);
    }
    throw new InputError('An unknown error occurred in addProductDb.');
  }
}
// below are functions for products but from quotes
export async function saveForLater(quoteId: string, productId: number): Promise<QuoteItemStatusResult> {
  try {
    const quoteItem = await prisma.quoteItem.findUnique({
      where: {
        quoteId_productId: {
          quoteId,
          productId,
        },
      },
    });
    
    if (!quoteItem) {
      throw new AccessError('Product does not exist in this quote!');
    }

    const newStatus = quoteItem.pickingStatus === 'backorder' ? 'pending' : 'backorder';
    
    const updatedItem = await prisma.quoteItem.update({
      where: {
        quoteId_productId: {
          quoteId,
          productId,
        },
      },
      data: {
        pickingStatus: newStatus,
      },
    });
    
    return {
      status: 'success',
      message: `Product "${updatedItem.productName}" ${newStatus === 'backorder' ? 'saved for later' : 'set to picking'}`,
      newStatus: updatedItem.pickingStatus as PickingStatus,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred in saveForLater.');
  }
}

export async function setUnavailable(quoteId: string, productId: number): Promise<QuoteItemStatusResult> {
  try {
    const quoteItem = await prisma.quoteItem.findUnique({
      where: {
        quoteId_productId: { quoteId, productId },
      },
    });

    if (!quoteItem) {
      throw new AccessError('Product does not exist in this quote!');
    }

    if (quoteItem.pickingStatus === 'completed') {
      return {
        status: 'error',
        message: `This product "${quoteItem.productName}" has already been picked and cannot change status.`,
        newStatus: quoteItem.pickingStatus as PickingStatus,
      };
    }

    const newStatus = quoteItem.pickingStatus === 'unavailable' ? 'pending' : 'unavailable';
    
    const updatedItem = await prisma.quoteItem.update({
      where: {
        quoteId_productId: { quoteId, productId },
      },
      data: {
        pickingStatus: newStatus,
      },
    });

    return {
      status: 'success',
      message: `Product "${updatedItem.productName}" ${newStatus === 'unavailable' ? 'is now unavailable' : 'is now set to picking'}`,
      newStatus: updatedItem.pickingStatus as PickingStatus,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred in setUnavailable.');
  }
}

export async function setProductFinished(quoteId: string, productId: number): Promise<QuoteItemFinishResult> {
  try {
    const updatedItem = await prisma.quoteItem.update({
      where: {
        quoteId_productId: { quoteId, productId },
      },
      data: {
        pickingQuantity: 0,
        pickingStatus: 'completed',
      },
    });

    if (!updatedItem) {
      throw new AccessError('Product does not exist in this quote!');
    }

    return { 
      pickingQty: updatedItem.pickingQuantity.toNumber(),
      newStatus: updatedItem.pickingStatus as PickingStatus,
      message: `Set ${updatedItem.productName} to finished!`
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred in setProductFinished.');
  }
}
