import { AccessError, InputError } from '../middlewares/errorHandler.js';
import { query } from '../helpers.js';
import { getBaseURL, getOAuthClient } from './authService.js';
import he from 'he';

export async function productIdToQboId(productId) {
  try {
    const result = await query(
      `SELECT qbo_item_id FROM products WHERE productid = $1`,
      [productId]
    );

    if (result.length === 0) {
      throw new AccessError(`No product found with productid=${productId}`);
    }

    return result[0].qbo_item_id;
  } catch (err) {
    throw new AccessError(err.message);
  }
}

export async function enrichWithQBOData(products, companyId) {
  const oauthClient = await getOAuthClient(companyId);
  const enriched = [];

  for (const product of products) {
    try {
      const query = `SELECT * FROM Item WHERE Sku = '${product.sku}'`;
      const baseURL = getBaseURL(oauthClient);
      const url = `${baseURL}v3/company/${companyId}/query?query=${encodeURIComponent(query)}&minorversion=75`;

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
        qbo_item_id: itemData.Id,
        tax_code_ref: itemData.SalesTaxCodeRef.value
      });
    } catch (err) {
      console.warn(`Failed QBO lookup for SKU ${product.sku}: ${err.message}`);
    }
  }

  return enriched;
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
        productname VARCHAR,
        barcode VARCHAR,
        sku VARCHAR,
        price NUMERIC,
        quantity_on_hand NUMERIC,
        qbo_item_id VARCHAR,
        companyid VARCHAR,
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
      p.qbo_item_id,
      companyId,
      p.tax_code_ref,
    ]);

    await client.query(`INSERT INTO temp_products VALUES (${values})`, params);

    // 3. Update existing products based on qbo_item_id
    await client.query(`
      UPDATE products AS p
      SET 
        productname     = tp.productname,
        category         = tp.category,
        barcode          = tp.barcode,
        sku              = tp.sku,
        price            = tp.price,
        quantity_on_hand = tp.quantity_on_hand,
        tax_code_ref     = tp.tax_code_ref
      FROM temp_products AS tp
      WHERE p.qbo_item_id = tp.qbo_item_id AND p.companyid = tp.companyid;
    `);

    // 4. Update existing products based on barcode
    // This handles the case where the barcode changes but qbo_item_id doesn't
    await client.query(`
      UPDATE products AS p
      SET 
        productname     = tp.productname,
        category         = tp.category,
        sku              = tp.sku,
        price            = tp.price,
        quantity_on_hand = tp.quantity_on_hand,
        tax_code_ref     = tp.tax_code_ref,
        qbo_item_id      = tp.qbo_item_id
      FROM temp_products AS tp
      WHERE p.barcode = tp.barcode AND p.companyid = tp.companyid AND p.qbo_item_id IS NULL;
    `);

    // 5. Insert new products
    await client.query(`
      INSERT INTO products (
        category, productname, barcode, sku, price, quantity_on_hand, qbo_item_id, companyid, tax_code_ref
      )
      SELECT 
        tp.category, tp.productname, tp.barcode, tp.sku, tp.price, tp.quantity_on_hand, tp.qbo_item_id, tp.companyid, tp.tax_code_ref
      FROM temp_products AS tp
      LEFT JOIN products AS p
        ON tp.qbo_item_id = p.qbo_item_id AND tp.companyid = p.companyid
      WHERE p.qbo_item_id IS NULL;
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
    const result = await query('SELECT productname FROM products WHERE barcode = $1', [barcode]);
    if (result.length === 0) {
      throw new InputError('This product does not exist within the database');
    }
    return result[0].productname;
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function getProductFromDB(QboProductId) {
  let result;
  try {
    result = await query(
      'SELECT * FROM products WHERE qbo_item_id = $1 AND is_archived = FALSE',
      [QboProductId]
    );
  } catch (err) {
    console.error(err);
    throw new AccessError('Error accessing the database');
  }

  if (result.length === 0) {
    throw new AccessError('This product does not exist within the database');
  }
  return result[0];
}

export async function getAllProducts(companyId) {
  try {
    const result = await query('SELECT * FROM products WHERE companyid = $1', [companyId]);
    return result.map(product => ({
      productId: product.productid,
      productName: product.productname,
      barcode: product.barcode ?? '',
      sku: product.sku ?? '',
      price: parseFloat(product.price),
      quantityOnHand: parseFloat(product.quantity_on_hand),
      companyId: Number(product.companyid),
      category: product.category ?? null,
      qboItemId: product.qbo_item_id ?? '',
      isArchived: product.is_archived
    }));
  } catch (error) {
    throw new AccessError(error.message);
  }
}

const fieldToDbColumnMap = {
  productName: 'productname',
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
    WHERE productid = $${fields.length + 1}
    RETURNING *;
  `;

  const result = await query(sqlQuery, [...values, productId]);
  return result[0];
}

export async function setProductArchiveStatusDb(productId, isArchived) {
  const result = await query(
    'UPDATE products SET is_archived = $1 WHERE productid = $2 RETURNING *;',
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

    const { price, quantity_on_hand, qbo_item_id, tax_code_ref } = enrichedProduct[0];

    const values = [
      productName,       // $1 → productname
      barcodeValue,      // $2 → barcode
      sku,               // $3 → sku
      price,             // $4 → price
      quantity_on_hand,  // $5 → quantity_on_hand
      qbo_item_id,       // $6 → qbo_item_id
      companyId,         // $7 → companyid
      tax_code_ref       // $8 → tax_code_ref
    ];
    const text = `
      INSERT INTO products
        (productname, barcode, sku, price, quantity_on_hand, qbo_item_id, companyid, tax_code_ref)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (sku) DO UPDATE
        SET productname      = EXCLUDED.productname,
            barcode          = EXCLUDED.barcode,
            price            = EXCLUDED.price,
            qbo_item_id      = EXCLUDED.qbo_item_id,
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
      'UPDATE quoteitems SET pickingstatus = CASE WHEN pickingstatus = \'backorder\' THEN \'pending\' ELSE \'backorder\' END WHERE quoteid = $1 AND productid = $2 RETURNING pickingstatus, productname',
      [quoteId, productId]
    );
    
    if (result.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    const newStatus = result[0].pickingstatus;
    const productName = result[0].productname;
    
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
      'SELECT pickingstatus, productname FROM quoteitems WHERE quoteid = $1 AND productid = $2',
      [quoteId, productId]
    );

    if (checkResult.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }

    const currentStatus = checkResult[0].pickingstatus;
    const productName = checkResult[0].productname;

    if (currentStatus === 'completed') {
      return {
        status: 'error',
        message: `This product "${productName}" has already been picked and cannot change status.`,
        newStatus: currentStatus
      };
    }

    const updateResult = await query(
      'UPDATE quoteitems SET pickingstatus = CASE WHEN pickingstatus = \'unavailable\' THEN \'pending\' ELSE \'unavailable\' END WHERE quoteid = $1 AND productid = $2 RETURNING pickingstatus',
      [quoteId, productId]
    );

    await query('UPDATE quotes SET lastmodified = CURRENT_TIMESTAMP WHERE quoteid = $1', [quoteId]);

    const newStatus = updateResult[0].pickingstatus;

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
      'UPDATE quoteitems SET pickingqty = 0, pickingstatus = \'completed\' WHERE quoteid = $1 AND productid = $2 RETURNING *',
      [quoteId, productId]
    );

    if (result.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    await query('UPDATE quotes SET lastmodified = CURRENT_TIMESTAMP WHERE quoteid = $1', [quoteId]);

    return { 
      pickingQty: result[0].pickingqty,
      newStatus: result[0].pickingstatus,
      message: `Set ${result[0].productname} to finished!`
    }
    ;
  } catch (error) {
    throw new AccessError(error.message);
  }
}
