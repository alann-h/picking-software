import excelToJson from 'convert-excel-to-json';
import fs from 'fs-extra';
import { AccessError, InputError } from './error.js';
import { query, transaction } from './helpers.js';
import { getBaseURL, getCompanyId } from './auth.js';
import format from 'pg-format';

export async function processFile(filePath, companyId) {
  try {
    const excelData = excelToJson({
      sourceFile: filePath,
      header: { rows: 1 },
      columnToKey: { '*': '{{columnHeader}}' }
    });
    await transaction(async (client) => {
      for (const key in excelData) {
        if (Object.prototype.hasOwnProperty.call(excelData, key)) {
          const products = excelData[key];

          const values = products.map(product => {
            const fullName = product["Product/Service Name"];
            let barcode = product.GTIN?.toString().trim();
            let isPlaceholder = false;

            if (!barcode || barcode.length === 0) {
              const random = Math.floor(10000000000000 + Math.random() * 90000000000000);
              barcode = `9${random.toString().slice(1)}`; // Ensure 14-digit placeholder starting with 9
              isPlaceholder = true;
            } else if (barcode.length === 13) {
              barcode = '0' + barcode;
            }

            // Extract category and product name
            const [category, productName] = fullName.split(/:(.+)/).map(s => s.trim());

            return [category, productName, barcode, companyId, isPlaceholder];
          });

          const query = format(
            `INSERT INTO products (category, productname, barcode, companyid, is_placeholder) 
             VALUES %L 
             ON CONFLICT (barcode) DO UPDATE 
             SET productname = EXCLUDED.productname, category = EXCLUDED.category, is_placeholder = EXCLUDED.is_placeholder`,
            values
          );

          await client.query(query);
        }
      }
    });

    await fs.remove(filePath);
    return 'Products uploaded successfully';
  } catch (error) {
    throw new Error(`Error processing file: ${error.message}`);
  }
}


export async function getProductFromQB(productId, oauthClient) {
  try {
    const query = `SELECT * from Item WHERE Id = '${productId}'`;
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    const url = `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=75`;

    const response = await oauthClient.makeApiCall({ url });
    const responseData = JSON.parse(response.text());
    const itemData = responseData.QueryResponse.Item[0];

    if (!itemData.Active) {
      throw new AccessError('Item is not active on quickbooks!');
    }
    
    const item = {
      id: itemData.Id,
      name: itemData.Name,
      sku: itemData.Sku,
      qtyOnHand: itemData.QtyOnHand,
      price: itemData.UnitPrice,
    };
    await saveProduct(item);
    return item;
  } catch (e) {
    throw new AccessError(e.message);
  }
}

async function saveProduct(item) {
  try {
    const result = await query(
      'UPDATE products SET qbo_item_id = $1, sku = $2, quantity_on_hand = $3, price = $4 WHERE productname = $5 RETURNING *',
      [item.id, item.sku, item.qtyOnHand, item.price, item.name]
    );

    if (result.length === 0) {
      const insertResult = await query(
        'INSERT INTO products (qbo_item_id, productname, sku, quantity_on_hand, price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [item.id, item.name, item.sku, item.qtyOnHand, item.price]
      );

      if (insertResult.length === 0) {
        throw new AccessError(`Failed to insert product ${item.name} into the database.`);
      }
    }
  } catch (err) {
    throw new AccessError(err.message);
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

export async function getProductFromDB(productId) {
  try {
    const result = await query('SELECT * FROM products WHERE qbo_item_id = $1', [productId]);
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
    const result = await query('SELECT productname, barcode FROM products WHERE companyid = $1', [companyId]);
    return result.map(product => ({
      productName: product.productname,
      barcode: product.barcode
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
    return result[0].pickingqty;
  } catch (error) {
    throw new AccessError(error.message);
  }
}
