import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query, transaction } from '../helpers.js';
import { getBaseURL, getOAuthClient, getRealmId } from './authService.js';
import he from 'he';
import { authSystem }from './authSystem.js';


export async function productIdToExternalId(productId) {
  try {
    const result = await query(
      `SELECT external_item_id FROM products WHERE id = $1`,
      [productId]
    );

    if (result.length === 0) {
      throw new AccessError(`No product found with id=${productId}`);
    }

    return result[0].external_item_id;
  } catch (err) {
    throw new AccessError(err.message);
  }
}

export async function enrichWithQBOData(products, companyId) {
  try {
    const oauthClient = await getOAuthClient(companyId, 'qbo');
    const enriched = [];

    for (const product of products) {
      try {
        const query = `SELECT * FROM Item WHERE Sku = '${product.sku}'`;
        const baseURL = getBaseURL(oauthClient, 'qbo');
        const realmId = getRealmId(oauthClient);
        const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=75`;

        const response = await oauthClient.makeApiCall({ url });
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
      } catch (err) {
        console.warn(`Failed QBO lookup for SKU ${product.sku}: ${err.message}`);
        // Add product without enrichment if QBO lookup fails
        enriched.push({
          ...product,
          price: product.price || 0,
          quantity_on_hand: product.quantity_on_hand || 0,
          external_item_id: null,
          tax_code_ref: null
        });
      }
    }

    return enriched;
  } catch (error) {
    console.error('Error enriching products with QBO data:', error);
    // Return products without enrichment if there's an error
    return products.map(product => ({
      ...product,
      price: product.price || 0,
      quantity_on_hand: product.quantity_on_hand || 0,
      external_item_id: null,
      tax_code_ref: null
    }));
  }
}

export async function enrichWithXeroData(products, companyId) {
  try {
    const oauthClient = await getOAuthClient(companyId, 'xero');
    const enriched = [];

    for (const product of products) {
      try {
        // Get tenant ID for Xero API calls
        const tenantId = await authSystem.getXeroTenantId(oauthClient);
        
        // Query Xero items by Code (equivalent to SKU)
        const response = await oauthClient.accountingApi.getItems(
          tenantId,
          undefined,  // ifModifiedSince
          `Code == "${product.sku}"`, // where filter
          undefined,  // order
          undefined,  // iDs
          1,          // page
          false,      // includeArchived
          undefined,  // searchTerm
          1           // pageSize
        );

        const items = response.body.items || [];
        const itemData = items[0]; // Get first matching item

        if (!itemData || !itemData.IsSold) continue;

        // For tracked inventory items, get quantity on hand
        let quantityOnHand = 0;
        if (itemData.IsTrackedAsInventory && itemData.QuantityOnHand !== undefined) {
          quantityOnHand = parseFloat(itemData.QuantityOnHand);
          if (!isFinite(quantityOnHand)) {
            console.warn(`Invalid quantity for SKU ${product.sku}`);
            quantityOnHand = 0;
          }
        }

        // Get price from SalesDetails
        const price = itemData.SalesDetails?.UnitPrice || 0;

        enriched.push({
          ...product,
          price: price,
          quantity_on_hand: quantityOnHand,
          external_item_id: itemData.ItemID,
          tax_code_ref: itemData.SalesDetails?.TaxType || null
        });
      } catch (err) {
        console.warn(`Failed Xero lookup for SKU ${product.sku}: ${err.message}`);
        // Add product without enrichment if Xero lookup fails
        enriched.push({
          ...product,
          price: product.price || 0,
          quantity_on_hand: product.quantity_on_hand || 0,
          external_item_id: null,
          tax_code_ref: null
        });
      }
    }

    return enriched;
  } catch (error) {
    console.error('Error enriching products with Xero data:', error);
    // Return products without enrichment if there's an error
    return products.map(product => ({
      ...product,
      price: product.price || 0,
      quantity_on_hand: product.quantity_on_hand || 0,
      external_item_id: null,
      tax_code_ref: null
    }));
  }
}

export async function upsertProducts(products, companyId) {
  if (products.length === 0) {
    return;
  }

  return await transaction(async (client) => {
    // Process products in batches for better performance
    const batchSize = 100;
    let processedCount = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      // Build the upsert query for this batch
      const values = batch.map((p, index) => {
        const start = index * 10;
        return `($${start + 1},$${start + 2},$${start + 3},$${start + 4},$${start + 5},$${start + 6},$${start + 7},$${start + 8},$${start + 9},$${start + 10})`;
      }).join(', ');

      const params = batch.flatMap(p => [
        companyId,
        p.productName,
        p.sku,
        p.barcode ?? null,
        p.external_item_id,
        p.category,
        p.tax_code_ref,
        p.price,
        p.quantity_on_hand,
        p.is_archived ?? false,
      ]);

      // Simple upsert - let PostgreSQL handle conflicts based on unique constraints
      // This will update existing products and insert new ones in one operation
      await client.query(`
        INSERT INTO products (
          company_id, product_name, sku, barcode, external_item_id, category, tax_code_ref, price, quantity_on_hand, is_archived
        )
        VALUES ${values}
        ON CONFLICT (company_id, sku) 
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          barcode = EXCLUDED.barcode,
          external_item_id = EXCLUDED.external_item_id,
          category = EXCLUDED.category,
          tax_code_ref = EXCLUDED.tax_code_ref,
          price = EXCLUDED.price,
          quantity_on_hand = EXCLUDED.quantity_on_hand,
          is_archived = EXCLUDED.is_archived,
          updated_at = NOW()
      `, params);

      processedCount += batch.length;
    }

    console.log(`✅ Successfully processed ${processedCount} products using efficient upsert.`);
    return processedCount;
  });
}

export async function getProductName(barcode, companyId) {
  try {
    const result = await query('SELECT product_name FROM products WHERE barcode = $1 AND company_id = $2', [barcode, companyId]);
    if (result.length === 0) {
      throw new InputError('This product does not exist within the database');
    }
    return result[0].product_name;
  } catch (error) {
    throw new AccessError(error.message);
  }
}

/**
 * Fetches multiple products from the database based on an array of external Item IDs.
 * @param {string[]} itemIds - An array of external item IDs to fetch.
 * @param {string} companyId - The company ID to filter products by.
 * @returns {Promise<object[]>} A promise that resolves to an array of any product objects found.
 */
export async function getProductsFromDBByIds(itemIds, companyId) {
  if (!itemIds || itemIds.length === 0) {
    return [];
  }

  const placeholders = itemIds.map((_, index) => `$${index + 1}`).join(', ');

  const sqlQuery = `SELECT * FROM products WHERE external_item_id IN (${placeholders}) AND company_id = $${itemIds.length + 1} AND is_archived = FALSE`;


  let results;
  try {
    results = await query(sqlQuery, [...itemIds, companyId]);
  } catch (err) {
    console.log(err);
    throw new AccessError('Error accessing the database while fetching products');
  }

  return results;
}

export async function getAllProducts(companyId) {
  try {
    const result = await query('SELECT * FROM products WHERE company_id = $1', [companyId]);
    return result.map(product => ({
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
  } catch (error) {
    throw new AccessError(error.message);
  }
}

const fieldToDbColumnMap = {
  productName: 'product_name',
  price: 'price',
  barcode: 'barcode',
  quantityOnHand: 'quantity_on_hand',
  sku: 'sku',
};

const fieldsToDecode = ['productName', 'sku'];

export async function updateProductDb(productId, updateFields) {
  const processedUpdateFields = {};

  for (const key in updateFields) {
    if (Object.hasOwn(updateFields, key)) {
      const dbColumnName = fieldToDbColumnMap[key];
      let value = updateFields[key];

      if (fieldsToDecode.includes(key) && typeof value === 'string') {
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

  const result = await query(sqlQuery, [...values, productId]);
  return result[0];
}

export async function setProductArchiveStatusDb(productId, isArchived) {
  const result = await query(
    'UPDATE products SET is_archived = $1 WHERE id = $2 RETURNING *;',
    [isArchived, productId]
  );
  return result[0];
}

export async function addProductDb(product, companyId, connectionType = 'qbo') {
  try{
    let enrichedProduct;
    if (connectionType === 'qbo') {
      enrichedProduct = await enrichWithQBOData(product, companyId);
    } else if (connectionType === 'xero') {
      enrichedProduct = await enrichWithXeroData(product, companyId);
    } else {
      // Default to QBO if connection type is not specified or unsupported
      enrichedProduct = await enrichWithQBOData(product, companyId);
    }

    let { productName, barcode, sku } = product[0];

    const barcodeValue = barcode === '' ? null : barcode;

    if (productName) { productName = he.decode(productName); }
    if (sku) { sku = he.decode(sku); }

    const { price, quantity_on_hand, external_item_id, tax_code_ref } = enrichedProduct[0];

    const values = [
      companyId,         // $1 → company_id
      productName,        // $2 → product_name
      sku,                // $3 → sku
      barcodeValue,       // $4 → barcode
      external_item_id,   // $5 → external_item_id
      null,               // $6 → category (not provided in this function)
      tax_code_ref,       // $7 → tax_code_ref
      price || 0,         // $8 → price
      quantity_on_hand || 0,  // $9 → quantity_on_hand
      false               // $10 → is_archived (default to false)
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

    const result = await query(text, values);
    return result[0].sku;

  } catch (err) {
    throw new InputError(`addProductDb failed: ${err.message}`);
  }
}
// below are functions for products but from quotes
export async function saveForLater(quoteId, productId) {
  try {
    const result = await query(
      'UPDATE quote_items SET picking_status = CASE WHEN picking_status = \'backorder\' THEN \'pending\' ELSE \'backorder\' END WHERE quote_id = $1 AND product_id = $2 RETURNING picking_status, product_name',
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
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function setUnavailable(quoteId, productId) {
  try {
    const checkResult = await query(
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

    const updateResult = await query(
      'UPDATE quote_items SET picking_status = CASE WHEN picking_status = \'unavailable\' THEN \'pending\' ELSE \'unavailable\' END WHERE quote_id = $1 AND product_id = $2 RETURNING picking_status',
      [quoteId, productId]
    );

    const newStatus = updateResult[0].picking_status;

    return {
      status: 'success',
      message: `Product "${productName}" ${newStatus === 'unavailable' ? 'is now unavailable' : 'is now set to picking'}`,
      newStatus: newStatus
    };
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function setProductFinished(quoteId, productId) {
  try {
    const result = await query(
      'UPDATE quote_items SET picking_quantity = 0, picking_status = \'completed\' WHERE quote_id = $1 AND product_id = $2 RETURNING *',
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
  } catch (error) {
    throw new AccessError(error.message);
  }
}
