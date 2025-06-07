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
  updateProduct,
  deleteProduct,
  getQboItemId,
  addProduct
} from '../controllers/productController.js';

const router = Router();

// Barcode lookup
router.get('/barcode/:barcode', isAuthenticated, asyncHandler(barcodeToName));

// Product retrieval
router.get('/:productId', isAuthenticated, asyncHandler(getProduct));
router.get('/', isAuthenticated, asyncHandler(listProducts));

// Quote-product operations
router.put('/for-later', isAuthenticated, asyncHandler(saveForLaterHandler));
router.put('/unavailable', isAuthenticated, asyncHandler(setUnavailableHandler));
router.put('/finished', isAuthenticated, asyncHandler(setFinishedHandler));

// Product CRUD
router.put('/:productId', isAuthenticated, asyncHandler(updateProduct));
router.delete('/:productId', isAuthenticated, asyncHandler(deleteProduct));

// QBO ID lookup & creation
router.get('/:productId/qbo-item-id', isAuthenticated, asyncHandler(getQboItemId));
router.post('/', isAuthenticated, asyncHandler(addProduct));

export default router;