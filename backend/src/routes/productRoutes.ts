// src/routes/productRoutes.js
import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import {
  barcodeToName,
  getProduct,
  listProducts,
  saveForLaterHandler,
  setUnavailableHandler,
  setFinishedHandler,
  completeBackorderHandler,
  updateProduct,
  getExternalId,
  addProduct,
  setProductArchiveStatus
} from '../controllers/productController.js';

import {
  validate,
  productIdRule,
  barcodeRule,
  addProductRules,
  updateProductRules,
  quoteProductRules,
  setArchiveStatusRules
} from '../validators/productValidator.js';

const router = Router();
router.use(isAuthenticated);

// Barcode lookup
router.get('/barcode/:barcode', barcodeRule(), validate, asyncHandler(barcodeToName));

// Product retrieval
router.get('/:productId', productIdRule(), validate, asyncHandler(getProduct));
router.get('/', asyncHandler(listProducts));

// Quote-product operations
router.put('/for-later', quoteProductRules(), validate, asyncHandler(saveForLaterHandler));
router.put('/unavailable', quoteProductRules(), validate, asyncHandler(setUnavailableHandler));
router.put('/finished', quoteProductRules(), validate, asyncHandler(setFinishedHandler));
router.put('/backorder/complete', quoteProductRules(), validate, asyncHandler(completeBackorderHandler));

// Product CRUD
router.put('/:productId', updateProductRules(), validate, asyncHandler(updateProduct));
router.put('/:productId/archive-status', setArchiveStatusRules(), validate, asyncHandler(setProductArchiveStatus));

// QBO ID lookup & creation
router.get('/:productId/external-item-id', productIdRule(), validate, asyncHandler(getExternalId));
router.post('/', addProductRules(), validate, asyncHandler(addProduct));

export default router;