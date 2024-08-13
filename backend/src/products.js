import excelToJson from 'convert-excel-to-json';
import fs from 'fs-extra';
import { AccessError, InputError } from './error';
import { query, transaction } from './helpers.js';
import { getBaseURL, getCompanyId } from './auth';
import format from 'pg-format';

export async function processFile(filePath) {
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
          const values = products.map(product => [
            product.Name,
            product.Barcode.toString()
          ]);
          // This query checks if the barcode exists in the DB if it does change the name if not add the name and barcode
          const query = format(
            'INSERT INTO products (productname, barcode) VALUES %L ON CONFLICT (barcode) DO UPDATE SET productname = EXCLUDED.productname',
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

export async function getProductFromQB(productName, oauthClient) {
  try {
    const query = `SELECT * from Item WHERE Name = '${productName}'`;
    const companyID = getCompanyId(oauthClient);
    const baseURL = getBaseURL(oauthClient);
    const url = `${baseURL}v3/company/${companyID}/query?query=${query}&minorversion=69`;

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
    }
    await saveProduct(item);
    return item;
  } catch (e) {
    throw new AccessError(e.message);
  }
}

async function saveProduct(item) {
  try {
    const result = await query(
      'UPDATE products SET productid = $1, sku = $2, quantity_on_hand = $3, price = $4 WHERE productname = $5 RETURNING *',
      [item.id, item.sku, item.qtyOnHand, item.price, item.name]
    );
    if (result.length === 0) {
      const insertResult = await query(
        'INSERT INTO products (productid, productname, sku, quantity_on_hand, price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
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
    const result = await query('SELECT * FROM products WHERE productid = $1', [productId]);
    if (result.length === 0) {
      throw new AccessError('This product does not exist within the database');
    }
    return result[0];
  } catch (error) {
    throw new AccessError('Error accessing the database');
  }
}

export async function getAllProducts() {
  try {
    const result = await query('SELECT productname, barcode FROM products');
    return result.map(product => ({
      productName: product.productname,
      barcode: product.barcode
    }));
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function saveForLater(quoteId, productId) {
  try {
    const result = await query(
      'UPDATE quoteitems SET pickingstatus = CASE WHEN pickingstatus = \'deferred\' THEN \'pending\' ELSE \'deferred\' END WHERE quoteid = $1 AND productid = $2 RETURNING pickingstatus, productname',
      [quoteId, productId]
    );
    
    if (result.length === 0) {
      throw new AccessError('Product does not exist in this quote!');
    }
    
    const newStatus = result[0].pickingstatus;
    const productName = result[0].productname;
    
    return {
      status: 'success',
      message: `Product "${productName}" ${newStatus === 'deferred' ? 'saved for later' : 'set to picking'}`,
      newStatus: newStatus
    };
  } catch (error) {
    throw new AccessError(error.message);
  }
}