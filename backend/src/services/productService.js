import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query } from '../helpers.js';
import { getBaseURL, getOAuthClient, getRealmId } from './authService.js';
import he from 'he';


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

export async function insertProductsTempTable(products, companyId, client) {
  if (products.length === 0) {
    return;
  }

  await client.query('BEGIN');

  try {
    // 1. Create a temporary table to hold the incoming data
    await client.query(`
      CREATE TEMP TABLE temp_products (
        category VARCHAR,
        product_name VARCHAR,
        barcode VARCHAR,
        sku VARCHAR,
        price NUMERIC,
        quantity_on_hand NUMERIC,
        external_item_id VARCHAR,
        id VARCHAR,
        tax_code_ref VARCHAR
      ) ON COMMIT DROP;
    `);

    // 2. Insert all products into the temporary table
    const values = products.map((p, index) => {
      const start = index * 9;
      return `$${start + 1},$${start + 2},$${start + 3},$${start + 4},$${start + 5},$${start + 6},$${start + 7},$${start + 8},$${start + 9}`;
    }).join('), (');

    const params = products.flatMap(p => [
      p.category,
      p.productName,
      p.barcode ?? null,
      p.sku,
      p.price,
      p.quantity_on_hand,
      p.external_item_id,
      companyId,
      p.tax_code_ref,
    ]);

    await client.query(`INSERT INTO temp_products VALUES (${values})`, params);

    // 3. Update existing products based on external_item_id
    await client.query(`
      UPDATE products AS p
      SET 
        product_name     = tp.product_name,
        category         = tp.category,
        barcode          = tp.barcode,
        sku              = tp.sku,
        price            = tp.price,
        quantity_on_hand = tp.quantity_on_hand,
        tax_code_ref     = tp.tax_code_ref
      FROM temp_products AS tp
      WHERE p.external_item_id = tp.external_item_id AND p.id = tp.id;
    `);

    // 4. Update existing products based on barcode
    // This handles the case where the barcode changes but external_item_id doesn't
    await client.query(`
      UPDATE products AS p
      SET 
        product_name     = tp.product_name,
        category         = tp.category,
        sku              = tp.sku,
        price            = tp.price,
        quantity_on_hand = tp.quantity_on_hand,
        tax_code_ref     = tp.tax_code_ref,
        external_item_id      = tp.external_item_id
      FROM temp_products AS tp
              WHERE p.barcode = tp.barcode AND p.id = tp.id AND p.external_item_id IS NULL;
    `);

    // 5. Insert new products
    await client.query(`
      INSERT INTO products (
        category, product_name, barcode, sku, price, quantity_on_hand, external_item_id, id, tax_code_ref
      )
      SELECT 
        tp.category, tp.product_name, tp.barcode, tp.sku, tp.price, tp.quantity_on_hand, tp.external_item_id, tp.id, tp.tax_code_ref
      FROM temp_products AS tp
      LEFT JOIN products AS p
        ON tp.external_item_id = p.external_item_id AND tp.id = p.id
      WHERE p.external_item_id IS NULL;
    `);

    await client.query('COMMIT');
    console.log(`✅ Successfully processed ${products.length} products using a temporary table.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Temporary table upsert failed. Rolling back.', err);
    throw err;
  }
}

export async function getProductName(barcode) {
  try {
    const result = await query('SELECT product_name FROM products WHERE barcode = $1', [barcode]);
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
 * @returns {Promise<object[]>} A promise that resolves to an array of any product objects found.
 */
export async function getProductsFromDBByIds(itemIds) {
  if (!itemIds || itemIds.length === 0) {
    return [];
  }

  const placeholders = itemIds.map((_, index) => `$${index + 1}`).join(', ');

  const sqlQuery = `SELECT * FROM products WHERE external_item_id IN (${placeholders}) AND is_archived = FALSE`;

  let results;
  try {
    results = await query(sqlQuery, itemIds);
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

export async function addProductDb(product, companyId) {
  try{
    const enrichedProduct = await enrichWithQBOData(product, companyId);

    let { productName, barcode, sku } = product[0];

    const barcodeValue = barcode === '' ? null : barcode;

    if (productName) { productName = he.decode(productName); }
    if (sku) { sku = he.decode(sku); }

    const { price, quantity_on_hand, external_item_id, tax_code_ref } = enrichedProduct[0];

    const values = [
      productName,       // $1 → product_name
      barcodeValue,      // $2 → barcode
      sku,               // $3 → sku
      price || 0,        // $4 → price
      quantity_on_hand || 0,  // $5 → quantity_on_hand
      external_item_id,       // $6 → external_item_id
      companyId,         // $7 → company_id
      tax_code_ref       // $8 → tax_code_ref
    ];
    const text = `
      INSERT INTO products
        (product_name, barcode, sku, price, quantity_on_hand, external_item_id, company_id, tax_code_ref)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (company_id, sku) DO UPDATE
        SET product_name      = EXCLUDED.product_name,
            barcode          = EXCLUDED.barcode,
            price            = EXCLUDED.price,
            external_item_id = EXCLUDED.external_item_id,
            quantity_on_hand = EXCLUDED.quantity_on_hand,
            tax_code_ref     = EXCLUDED.tax_code_ref
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
