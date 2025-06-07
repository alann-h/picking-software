// src/controllers/productController.js
import {
    productIdToQboId,
    getProductFromDB,
    getAllProducts,
    saveForLater,
    setUnavailable,
    setProductFinished,
    updateProductDb,
    deleteProductDb,
    addProductDb,
    getProductName
} from '../services/productService.js';
import { AccessError } from '../middlewares/errorHandler.js';

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
    const qboItemId = await productIdToQboId(parseInt(productId, 10));
    const productData = await getProductFromDB(qboItemId);
    res.json(productData);
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

// DELETE /products/:productId
export async function deleteProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const result = await deleteProductDb(productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /products/:productId/qbo-item-id
export async function getQboItemId(req, res, next) {
  try {
    const pid = parseInt(req.params.productId, 10);
    if (isNaN(pid)) throw new AccessError('Invalid productId parameter');
    const qboItemId = await productIdToQboId(pid);
    res.json({ qboItemId });
  } catch (err) {
    next(err);
  }
}

// POST /products
export async function addProduct(req, res, next) {
  try {
    const { productName, sku, barcode } = req.body;
    const productArr = [{ productName, sku, barcode }];
    const result = await addProductDb(productArr, req.session.companyId, req.decryptedToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
