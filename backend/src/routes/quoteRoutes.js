// src/routes/quoteRoutes.js
import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import {
  getEstimates,
  getEstimateById,
  listQuotes,
  updateStatus,
  syncToQuickBooks,
  addProduct,
  adjustQty,
  scanProduct,
  savePickerNoteController
} from '../controllers/quoteController.js';

const router = Router();

// Estimate endpoints
router.get('/customer/:customerId', isAuthenticated, asyncHandler(getEstimates));
router.get('/:quoteId', isAuthenticated, asyncHandler(getEstimateById));

// List and update quotes
router.get('/', isAuthenticated, asyncHandler(listQuotes));
router.put('/status', isAuthenticated, asyncHandler(updateStatus));
router.put('/picker-note', isAuthenticated, asyncHandler(savePickerNoteController));
// Sync with QuickBooks
router.put('/:quoteId/quickbooks', isAuthenticated, asyncHandler(syncToQuickBooks));

// Quote item endpoints
router.put('/products', isAuthenticated, asyncHandler(addProduct));
router.put('/products/qty', isAuthenticated, asyncHandler(adjustQty));

// Scan product into quote by barcode
router.put('/products/scan', isAuthenticated, asyncHandler(scanProduct));

export default router;