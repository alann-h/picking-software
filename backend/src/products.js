import excelToJson from 'convert-excel-to-json';
import fs from 'fs-extra';
import { AccessError, InputError } from './error';
import { readDatabase, writeDatabase } from './helpers';
import { getBaseURL, getCompanyId } from './auth';

export async function processFile(filePath) {
  try {
    const excelData = excelToJson({
      sourceFile: filePath,
      header: { rows: 1 },
      columnToKey: { '*': '{{columnHeader}}' }
    });

    const database = readDatabase();
    database.products = {}; // Initialize as an empty object

    for (const key in excelData) {
      if (Object.prototype.hasOwnProperty.call(excelData, key)) {
        const products = excelData[key];
        products.forEach(product => {
          const productInfo = {
            barcode: product.Barcode
          };
          database.products[product.Name] = productInfo;
        });
      }
    }

    writeDatabase(database);

    await fs.remove(filePath);
    return 'Products uploaded successfully';
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export async function getProductFromQB(itemId, oauthClient) {
  try {
    const query = `SELECT * from Item WHERE Id = '${itemId}'`;
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
    saveProduct(item);
    return item
  } catch (e) {
    throw new AccessError(e); 
  }
}

function saveProduct(item) {
  try {
    const database = readDatabase();

    if (database.products[item.name]) {
      database.products[item.name] = {
        ...database.products[item.name],
        id: item.id,
        sku: item.sku,
        qtyOnHand: item.qtyOnHand,
        price: item.price
      };
    } else {
      throw new AccessError(`Product with name ${item.name} does not exist in the database. Please upload excel file with new product.`);
    }
    writeDatabase(database);
  } catch (err) {
    throw new AccessError(`${err.message}`);
  }
}

export async function getProductName(barcode) {
  try {
    const database = readDatabase();
    let productName = null;
    for (const name in database.products) {
      if (database.products[name].barcode === barcode) {
        productName = name;
        break;
      }
    }
    if (!productName) {
      throw new InputError('This product does not exist within the database');
    }
    return productName;
  } catch (error) {
    throw new AccessError(error.message);
  }
}

export function getProductFromDB(productName) {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase();
      if (database.products[productName]) {
        resolve(database.products[productName]);
      } else {
        reject(new AccessError('This product does not exist within the database'));
      }
    } catch (error) {
      reject(new AccessError('Error accessing the database'));
    }
  });
}

export function getAllProducts() {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase();
      const products = database.products;
      const formattedProducts = Object.entries(products).map(([name, details]) => ({
        productName: name,
        barcode: details.barcode
      }));
      resolve(formattedProducts);
    } catch (error) {
      reject(new AccessError(error));
    }
  });
}

export function saveForLater(quoteId, productName) {
  return new Promise((resolve, reject) => {
    try {
      const database = readDatabase();
      const quote = database.quotes[quoteId];
      if (!quote) {
        throw new AccessError('Quote does not exist in database!');
      }
      const product = quote.productInfo[productName];
      if (!product) {
        throw new AccessError('Product does not exist in this quote!');
      }
      product.pickingStatus = product.pickingStatus === 'deferred' ? 'pending' : 'deferred';

      writeDatabase(database);
      resolve({
        status: 'success',
        message: `Product ${product.pickingStatus === 'deferred' ? 'saved for later' : 'set to picking'}`
      });
      } catch (error) {
        reject(new AccessError(error.message));
      }
  })
}
