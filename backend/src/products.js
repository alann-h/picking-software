import excelToJson from 'convert-excel-to-json';
import fs from 'fs-extra';
import { AccessError, InputError } from './error.js';
import { query } from './helpers.js';
import { getBaseURL, getCompanyId, getOAuthClient } from './auth.js';

export async function processFile(filePath) {
  try {
    const excelData = excelToJson({
      sourceFile: filePath,
      header: { rows: 1 },
      columnToKey: { '*': '{{columnHeader}}' }
    });

    const allProducts = [];

    for (const sheet in excelData) {
      if (Object.prototype.hasOwnProperty.call(excelData, sheet)) {
        const products = excelData[sheet];

        for (const product of products) {
          const fullName = product["Product/Service Name"];
          const sku = product["SKU"]?.toString().trim();
          const barcodeRaw = product.GTIN?.toString().trim();
          const barcode = barcodeRaw?.length === 13 ? '0' + barcodeRaw : barcodeRaw;

          if (!fullName || !sku) continue;

          const [category, productName] = fullName.split(/:(.+)/).map(s => s.trim());

          allProducts.push({ category, productName, barcode, sku });
        }
      }
    }

    await fs.remove(filePath);
    return allProducts;
  } catch (error) {
    throw new Error(`Error processing file: ${error.message}`);
  }
}

export async function enrichWithQBOData(products, token) {
  const oauthClient = await getOAuthClient(token);
  const enriched = [];

  for (const product of products) {
    try {
      const query = `SELECT * FROM Item WHERE Sku = '${product.sku}'`;
      const companyID = getCompanyId(oauthClient);
      const baseURL = getBaseURL(oauthClient);
      const url = `${baseURL}v3/company/${companyID}/query?query=${encodeURIComponent(query)}&minorversion=75`;

      const response = await oauthClient.makeApiCall({ url });
      const itemData = JSON.parse(response.text())?.QueryResponse?.Item?.[0];

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

export async function insertProducts(products, companyId, client) {
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const savepointName = `sp_${i}`;

    await client.query(`SAVEPOINT ${savepointName}`);

    try {
      const { rows } = await client.query(
        `INSERT INTO products
           (category, productname, barcode, sku, price, quantity_on_hand, qbo_item_id, companyid, tax_code_ref)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (sku) DO UPDATE
           SET productname     = EXCLUDED.productname,
              category         = EXCLUDED.category,
              barcode          = EXCLUDED.barcode,
              price            = EXCLUDED.price,
              qbo_item_id      = EXCLUDED.qbo_item_id,
              quantity_on_hand = EXCLUDED.quantity_on_hand,
              tax_code_ref     = EXCLUDED.tax_code_ref
         RETURNING sku`,
        [
          p.category,
          p.productName,
          p.barcode ?? null,
          p.sku,
          p.price,
          p.quantity_on_hand,
          p.qbo_item_id,
          companyId,
          p.tax_code_ref
        ]
      );
      console.log(`  ➕ Upserted SKU=${rows[0].sku}`);
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      console.warn(`⚠️ Skipped SKU=${p.sku} — ${err.code || err.message}`);
    }
    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
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
  try {
    const result = await query('SELECT * FROM products WHERE qbo_item_id = $1', [QboProductId]);
    if (result.length === 0) {
      throw new AccessError('This product does not exist within the database');
    }
    return result[0];
  } catch (error) {
    throw new AccessError('Error accessing the database');
  }
}

export async function getAllProducts(companyId) {
  try {
    const result = await query('SELECT productname, barcode, productid FROM products WHERE companyid = $1', [companyId]);
    return result.map(product => ({
      productName: product.productname,
      barcode: product.barcode,
      productId: product.productid
    }));
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function updateProductDb(productId, updateFields) {
  const fields = Object.keys(updateFields);
  const values = Object.values(updateFields);

  if (fields.length === 0) {
    throw new Error('No fields provided for update');
  }

  const setClause = fields
  .map((field, index) => `"${field}" = $${index + 1}`)
  .join(', ');

  const query = `
    UPDATE products
    SET ${setClause}
    WHERE productid = $${fields.length + 1}
    RETURNING *;
  `;

  const result = await query(query, [...values, productId]);
  return result.rows[0];
}

export async function deleteProductDb(productId) {
  const result = await query(
    'DELETE FROM products WHERE productid = $1 RETURNING *;',
    [productId]
  );
  return result.rows[0];
}

export async function addProductDb(product, companyId, token) {
  try{
    const enrichedProduct = await enrichWithQBOData(product, token);

    const { productName, barcode, sku } = product;

    const { price, quantity_on_hand, qbo_item_id, tax_code_ref } = enrichedProduct;

    const values = [
      productName,       // $1 → productname
      barcode,           // $2 → barcode
      sku,               // $3 → sku
      price,             // $4 → price
      quantity_on_hand,  // $5 → quantity_on_hand
      qbo_item_id,       // $6 → qbo_item_id
      // category,          // $7 → category ignore for now
      companyId,          // $8 → companyid
      tax_code_ref
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

    const { rows } = await query(text, values);

    return rows[0].sku;

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
    return { 
      pickingQty: result[0].pickingqty,
      newStatus: result[0].pickingstatus
    }
    ;
  } catch (error) {
    throw new AccessError(error.message);
  }
}
