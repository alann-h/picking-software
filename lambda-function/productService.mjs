import excelToJson from 'convert-excel-to-json';
import { getBaseURL, getCompanyId, getOAuthClient } from './authService.mjs';

export async function processFile(filePath) {
  try {
    console.log(`Starting Excel to JSON conversion for file: ${filePath}`);
    const excelData = excelToJson({
      sourceFile: filePath,
      header: { rows: 1 },
      columnToKey: { '*': '{{columnHeader}}' }
    });

    const allProducts = [];

    if (typeof excelData !== 'object' || excelData === null) {
        throw new Error('Excel data could not be parsed or is empty.');
    }

    for (const sheet in excelData) {
      if (Object.prototype.hasOwnProperty.call(excelData, sheet)) {
        const products = excelData[sheet];

        if (!Array.isArray(products)) {
            console.warn(`Sheet ${sheet} did not contain an array of products. Skipping.`);
            continue;
        }

        for (const product of products) {
          if (typeof product !== 'object' || product === null) {
              console.warn('Skipping non-object product entry:', product);
              continue;
          }

          const fullName = product["Product/Service Name"];
          const sku = product["SKU"]?.toString().trim();
          const barcodeRaw = product.GTIN?.toString().trim();
          const barcode = barcodeRaw?.length === 13 ? '0' + barcodeRaw : barcodeRaw;

          if (!fullName || !sku) {
            console.warn(`Skipping product due to missing Full Name or SKU:`, product);
            continue;
          }

          const [category, productName] = fullName.split(/:(.+)/).map(s => s.trim());

          allProducts.push({ category, productName, barcode, sku });
        }
      }
    }
    console.log(`Successfully parsed ${allProducts.length} products from ${filePath}`);

    return allProducts;
  } catch (error) {
    console.error(`Error in processFile for ${filePath}:`, error);
    throw new Error(`Error processing file: ${error.message}`);
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function enrichWithQBOData(products, token) {
  const oauthClient = await getOAuthClient(token);
  const enriched = [];
  const batchSize = 3;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    console.log(`Enriching batch starting with SKU: ${batch[0].sku}`);

    const promises = batch.map(async (product) => {
      try {
        const query = `SELECT * FROM Item WHERE Sku = '${product.sku}'`;
        const companyID = getCompanyId(oauthClient);
        const baseURL = getBaseURL(oauthClient);
        const url = `${baseURL}v3/company/${companyID}/query?query=${encodeURIComponent(query)}&minorversion=75`;

        const response = await oauthClient.makeApiCall({ url });
        const itemData = response.json?.QueryResponse?.Item?.[0];

        if (!itemData || !itemData.Active) return null;

        const QtyOnHand = parseFloat(itemData.QtyOnHand);
        if (!isFinite(QtyOnHand)) {
          console.warn(`Invalid quantity for SKU ${product.sku}`);
          return null;
        }
        console.log(`Successfully enriched SKU ${product.sku}`);
        
        return {
          ...product,
          price: itemData.UnitPrice,
          quantity_on_hand: QtyOnHand,
          qbo_item_id: itemData.Id,
          tax_code_ref: itemData.SalesTaxCodeRef.value
        };
      } catch (err) {
        console.warn(`Failed QBO lookup for SKU ${product.sku}: ${err.message}`);
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    enriched.push(...batchResults.filter(p => p !== null));
    await delay(500);
  }

  return enriched;
}
