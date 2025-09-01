// src/controllers/productController.js
import {
    productIdToExternalId,
    getProductsFromDBByIds,
    getAllProducts,
    saveForLater,
    setUnavailable,
    setProductFinished,
    updateProductDb,
    setProductArchiveStatusDb,
    addProductDb,
    getProductName
} from '../services/productService.js';

// GET /products/barcode/:barcode
export async function barcodeToName(req, res, next) {
  try {
    const productName = await getProductName(req.params.barcode);
    res.json({ productName });
  } catch (err) {
    next(err);
  }
}

// GET /products/:productId
export async function getProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const externalId = await productIdToExternalId(parseInt(productId, 10));
    const productData = await getProductsFromDBByIds([externalId]);
    res.json(productData[0]);
  } catch (err) {
    next(err);
  }
}

// GET /products
export async function listProducts(req, res, next) {
  try {
    const products = await getAllProducts(req.session.companyId);
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// PUT /products/for-later
export async function saveForLaterHandler(req, res, next) {
  try {
    const { quoteId, productId } = req.body;
    const result = await saveForLater(quoteId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /products/unavailable
export async function setUnavailableHandler(req, res, next) {
  try {
    const { quoteId, productId } = req.body;
    const result = await setUnavailable(quoteId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /products/finished
export async function setFinishedHandler(req, res, next) {
  try {
    const { quoteId, productId } = req.body;
    const result = await setProductFinished(quoteId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /products/:productId
export async function updateProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const updateFields = req.body;
    const result = await updateProductDb(productId, updateFields);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /products/:productId/archive-status
export async function setProductArchiveStatus(req, res, next) {
  try {
    const { productId } = req.params;
    const { isArchived } = req.body;
    const result = await setProductArchiveStatusDb(productId, isArchived);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /products/:productId/external-item-id
export async function getExternalId(req, res, next) {
  try {
    const { productId } = req.params;

    const externalId = await productIdToExternalId(productId);
    res.json({ externalId });
  } catch (err) {
    next(err);
  }
}

// POST /products
export async function addProduct(req, res, next) {
  try {
    const { productName, sku, barcode } = req.body;
    const connectionType = req.session.connectionType || 'qbo';
    
    const productArr = [{ productName, sku, barcode }];
    const result = await addProductDb(productArr, req.session.companyId, connectionType);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
