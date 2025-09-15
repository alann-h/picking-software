// src/controllers/productController.ts
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
import { Request, Response, NextFunction } from 'express';

// GET /products/barcode/:barcode
export async function barcodeToName(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const productName = await getProductName(req.params.barcode, companyId);
    res.json({ productName });
  } catch (err) {
    next(err);
  }
}

// GET /products/:productId
export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const externalId = await productIdToExternalId(parseInt(productId, 10));
    const productData = await getProductsFromDBByIds([externalId], companyId);
    
    // Convert BigInt id to string for JSON serialization
    const serializedResult = {
      ...productData[0],
      id: productData[0].id.toString()
    };
    
    res.json(serializedResult);
  } catch (err) {
    next(err);
  }
}

// GET /products
export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.session.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const products = await getAllProducts(companyId);
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// PUT /products/for-later
export async function saveForLaterHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { quoteId, productId } = req.body;
    const result = await saveForLater(quoteId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /products/unavailable
export async function setUnavailableHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { quoteId, productId } = req.body;
    const result = await setUnavailable(quoteId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /products/finished
export async function setFinishedHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { quoteId, productId } = req.body;
    const result = await setProductFinished(quoteId, productId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /products/:productId
export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const updateFields = req.body;
    const result = await updateProductDb(parseInt(productId, 10), updateFields);
    
    // Convert BigInt id to string for JSON serialization
    const serializedResult = {
      ...result,
      id: result.id.toString()
    };
    
    res.json(serializedResult);
  } catch (err) {
    next(err);
  }
}

// PUT /products/:productId/archive-status
export async function setProductArchiveStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const { isArchived } = req.body;
    const result = await setProductArchiveStatusDb(parseInt(productId, 10), isArchived);
    
    // Convert BigInt id to string for JSON serialization
    const serializedResult = {
      ...result,
      id: result.id.toString()
    };
    
    res.json(serializedResult);
  } catch (err) {
    next(err);
  }
}

// GET /products/:productId/external-item-id
export async function getExternalId(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;

    const externalId = await productIdToExternalId(parseInt(productId, 10));
    res.json({ externalId });
  } catch (err) {
    next(err);
  }
}

// POST /products
export async function addProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productName, sku, barcode } = req.body;
    const companyId = req.session.companyId;
    const connectionType = req.session.connectionType || 'qbo';

    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const productArr = [{ productName, sku, barcode }];
    const result = await addProductDb(productArr, companyId, connectionType);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
