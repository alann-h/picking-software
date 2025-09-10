import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction } from '../helpers.js';
import { getBaseURL, getOAuthClient, getRealmId } from './authService.js';
import he from 'he';
import { authSystem }from './authSystem.js';
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
import { PoolClient } from 'pg';

export async function productIdToExternalId(productId: number): Promise<string> {
  try {
    const result: { external_item_id: string }[] = await query(
      `SELECT external_item_id FROM products WHERE id = $1`,
      [productId]
    );

    if (result.length === 0) {
      throw new AccessError(`No product found with id=${productId}`);
    }

    return result[0].external_item_id;
  } catch (err: any) {
    throw new AccessError(err.message);
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
      } catch (err: any) {
        console.warn(`Failed QBO lookup for SKU ${product.sku}: ${err.message}`);
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
  } catch (error: any) {
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
      } catch (err: any) {
        console.warn(`Failed Xero lookup for SKU ${product.sku}: ${err.message}`);
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
  } catch (error: any) {
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
    return;
  }

  return await transaction(async (client: PoolClient) => {
    const skuMap = new Map<string, EnrichableProduct>();
    products.forEach(product => {
      skuMap.set(product.sku, product);
    });
    const deduplicatedProducts = Array.from(skuMap.values());

    const batchSize = 100;
    let processedCount = 0;

    for (let i = 0; i < deduplicatedProducts.length; i += batchSize) {
      const batch = deduplicatedProducts.slice(i, i + batchSize);
      
      for (const product of batch) {
        const productParams = [
          companyId,
          product.productName,
          product.sku,
          product.barcode ?? null,
          product.external_item_id,
          product.category,
          product.tax_code_ref,
          product.price,
          product.quantity_on_hand,
          product.is_archived ?? false,
        ];

        const skuUpdateResult = await client.query(`
          UPDATE products SET
            product_name = $2,
            barcode = $4,
            external_item_id = $5,
            category = $6,
            tax_code_ref = $7,
            price = $8,
            quantity_on_hand = $9,
            is_archived = $10,
            updated_at = NOW()
          WHERE company_id = $1 AND sku = $3
          RETURNING id
        `, productParams);

        if (skuUpdateResult.rowCount === 0 && product.barcode && product.barcode.trim() !== '') {
          const barcodeUpdateResult = await client.query(`
            UPDATE products SET
              product_name = $2,
              sku = $3,
              external_item_id = $5,
              category = $6,
              tax_code_ref = $7,
              price = $8,
              quantity_on_hand = $9,
              is_archived = $10,
              updated_at = NOW()
            WHERE company_id = $1 AND barcode = $4
            RETURNING id
          `, productParams);

          if (barcodeUpdateResult.rowCount === 0) {
            await client.query(`
              INSERT INTO products (
                company_id, product_name, sku, barcode, external_item_id, category, tax_code_ref, price, quantity_on_hand, is_archived
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, productParams);
          }
        } else if (skuUpdateResult.rowCount === 0) {
          await client.query(`
            INSERT INTO products (
              company_id, product_name, sku, barcode, external_item_id, category, tax_code_ref, price, quantity_on_hand, is_archived
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, productParams);
        }
      }

      processedCount += batch.length;
    }

    console.log(`✅ Successfully processed ${processedCount} products using efficient upsert (${products.length - deduplicatedProducts.length} duplicates removed).`);
    return processedCount;
  });
}

export async function getProductName(barcode: string, companyId: string): Promise<string> {
  try {
    const result: { product_name: string }[] = await query('SELECT product_name FROM products WHERE barcode = $1 AND company_id = $2', [barcode, companyId]);
    if (result.length === 0) {
      throw new InputError('This product does not exist within the database');
    }
    return result[0].product_name;
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function getProductsFromDBByIds(itemIds: string[], companyId: string): Promise<Product[]> {
  if (!itemIds || itemIds.length === 0) {
    return [];
  }

  const placeholders = itemIds.map((_, index) => `$${index + 1}`).join(', ');

  const sqlQuery = `SELECT * FROM products WHERE external_item_id IN (${placeholders}) AND company_id = $${itemIds.length + 1} AND is_archived = FALSE`;


  let results: Product[];
  try {
    results = await query(sqlQuery, [...itemIds, companyId]);
  } catch (err: any) {
    console.log(err);
    throw new AccessError('Error accessing the database while fetching products');
  }

  return results;
}

export async function getAllProducts(companyId: string): Promise<ClientProduct[]> {
  try {
    const result: Product[] = await query('SELECT * FROM products WHERE company_id = $1', [companyId]);
    return result.map((product: Product) => ({
      productId: product.id,
      productName: product.product_name,
      barcode: product.barcode ?? '',
      sku: product.sku ?? '',
      price: parseFloat(product.price),
      quantityOnHand: parseFloat(product.quantity_on_hand),
      companyId: product.company_id,
      category: product.category ?? null,
      externalItemId: product.external_item_id ?? '',
      isArchived: product.is_archived
    }));
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

const fieldToDbColumnMap: { [key in keyof UpdateProductPayload]: keyof Product | null } = {
  productName: 'product_name',
  price: 'price',
  barcode: 'barcode',
  quantityOnHand: 'quantity_on_hand',
  sku: 'sku',
};

const fieldsToDecode: (keyof UpdateProductPayload)[] = ['productName', 'sku'];

export async function updateProductDb(productId: number, updateFields: UpdateProductPayload): Promise<Product> {
  const processedUpdateFields: { [key: string]: any } = {};

  for (const key in updateFields) {
    if (Object.hasOwn(updateFields, key)) {
      const dbColumnName = fieldToDbColumnMap[key as keyof UpdateProductPayload];
      let value = updateFields[key as keyof UpdateProductPayload];

      if (fieldsToDecode.includes(key as keyof UpdateProductPayload) && typeof value === 'string') {
        value = he.decode(value);
      }

      if (dbColumnName) {
        processedUpdateFields[dbColumnName] = value;
      } else {
        console.warn(`Attempted to update unknown field "${key}". Skipping.`);
      }
    }
  }

  const fields = Object.keys(processedUpdateFields);
  const values = Object.values(processedUpdateFields);
  
  if (fields.length === 0) {
    throw new Error('No fields provided for update');
  }

  const setClause = fields
  .map((field, index) => `"${field}" = $${index + 1}`)
  .join(', ');

  const sqlQuery = `
    UPDATE products
    SET ${setClause}
    WHERE id = $${fields.length + 1}
    RETURNING *;
  `;

  const result: Product[] = await query(sqlQuery, [...values, productId]);
  return result[0];
}

export async function setProductArchiveStatusDb(productId: number, isArchived: boolean): Promise<Product> {
  const result: Product[] = await query(
    'UPDATE products SET is_archived = $1 WHERE id = $2 RETURNING *;',
    [isArchived, productId]
  );
  return result[0];
}

export async function addProductDb(product: NewProductData[], companyId: string, connectionType: ConnectionType = 'qbo'): Promise<string> {
  try{
    let enrichedProduct;
    const enrichable = product.map(p => ({ ...p, productName: p.productName }));

    if (connectionType === 'qbo') {
      enrichedProduct = await enrichWithQBOData(enrichable, companyId);
    } else if (connectionType === 'xero') {
      enrichedProduct = await enrichWithXeroData(enrichable, companyId);
    } else {
      enrichedProduct = await enrichWithQBOData(enrichable, companyId);
    }

    let { productName, barcode, sku } = product[0];

    const barcodeValue = barcode === '' ? null : barcode;

    if (productName) { productName = he.decode(productName); }
    if (sku) { sku = he.decode(sku); }

    const { price, quantity_on_hand, external_item_id, tax_code_ref } = enrichedProduct[0];

    const values = [
      companyId,
      productName,
      sku,
      barcodeValue,
      external_item_id,
      null,
      tax_code_ref,
      price || 0,
      quantity_on_hand || 0,
      false
    ];
    const text = `
      INSERT INTO products
        (company_id, product_name, sku, barcode, external_item_id, category, tax_code_ref, price, quantity_on_hand, is_archived)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (company_id, sku) DO UPDATE
        SET product_name      = EXCLUDED.product_name,
            barcode          = EXCLUDED.barcode,
            external_item_id = EXCLUDED.external_item_id,
            category         = EXCLUDED.category,
            tax_code_ref     = EXCLUDED.tax_code_ref,
            price            = EXCLUDED.price,
            quantity_on_hand = EXCLUDED.quantity_on_hand,
            is_archived      = EXCLUDED.is_archived,
            updated_at       = NOW()
      RETURNING sku;
    `;

    const result: { sku: string }[] = await query(text, values);
    return result[0].sku;

  } catch (err: any) {
    throw new InputError(`addProductDb failed: ${err.message}`);
  }
}
// below are functions for products but from quotes
export async function saveForLater(quoteId: string, productId: number): Promise<QuoteItemStatusResult> {
  try {
    const result: { picking_status: PickingStatus, product_name: string }[] = await query(
      'UPDATE quote_items SET picking_status = CASE WHEN picking_status = \'backorder\'::picking_status THEN \'pending\'::picking_status ELSE \'backorder\'::picking_status END WHERE quote_id = $1 AND product_id = $2 RETURNING picking_status, product_name',
      [quoteId, productId]
    );
    
    if (result.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    const newStatus = result[0].picking_status;
    const productName = result[0].product_name;
    
    return {
      status: 'success',
      message: `Product "${productName}" ${newStatus === 'backorder' ? 'saved for later' : 'set to picking'}`,
      newStatus: newStatus
    };
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function setUnavailable(quoteId: string, productId: number): Promise<QuoteItemStatusResult> {
  try {
    const checkResult: { picking_status: PickingStatus, product_name: string }[] = await query(
      'SELECT picking_status, product_name FROM quote_items WHERE quote_id = $1 AND product_id = $2',
      [quoteId, productId]
    );

    if (checkResult.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }

    const currentStatus = checkResult[0].picking_status;
    const productName = checkResult[0].product_name;

    if (currentStatus === 'completed') {
      return {
        status: 'error',
        message: `This product "${productName}" has already been picked and cannot change status.`,
        newStatus: currentStatus
      };
    }

    const updateResult: { picking_status: PickingStatus }[] = await query(
      'UPDATE quote_items SET picking_status = CASE WHEN picking_status = \'unavailable\'::picking_status THEN \'pending\'::picking_status ELSE \'unavailable\'::picking_status END WHERE quote_id = $1 AND product_id = $2 RETURNING picking_status',
      [quoteId, productId]
    );

    const newStatus = updateResult[0].picking_status;

    return {
      status: 'success',
      message: `Product "${productName}" ${newStatus === 'unavailable' ? 'is now unavailable' : 'is now set to picking'}`,
      newStatus: newStatus
    };
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}

export async function setProductFinished(quoteId: string, productId: number): Promise<QuoteItemFinishResult> {
  try {
    const result: { picking_quantity: number, picking_status: PickingStatus, product_name: string }[] = await query(
      'UPDATE quote_items SET picking_quantity = 0, picking_status = \'completed\'::picking_status WHERE quote_id = $1 AND product_id = $2 RETURNING *',
      [quoteId, productId]
    );

    if (result.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }

    return { 
      pickingQty: result[0].picking_quantity,
      newStatus: result[0].picking_status,
      message: `Set ${result[0].product_name} to finished!`
    }
    ;
  } catch (error: any) {
    throw new AccessError(error.message);
  }
}
