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
  savePickerNoteController,
  bulkDeleteQuotes
} from '../controllers/quoteController.js';

import {
  validate,
  customerIdRule,
  quoteIdRule,
  listQuotesRules,
  updateStatusRules,
  pickerNoteRules,
  addProductRules,
  adjustQtyRules,
  scanRules,
  bulkDeleteRules,
} from '../validators/quoteValidator.js';

const router = Router();
router.use(isAuthenticated);

// Estimate endpoints
router.get('/customer/:customerId', customerIdRule(), validate, asyncHandler(getEstimates));
router.get('/:quoteId', quoteIdRule(), validate, asyncHandler(getEstimateById));

// List and update quotes
router.get('/', listQuotesRules(), validate, asyncHandler(listQuotes));
router.put('/status', updateStatusRules(), validate, asyncHandler(updateStatus));
router.put('/picker-note', pickerNoteRules(), validate, asyncHandler(savePickerNoteController));
// Sync with QuickBooks
router.put('/:quoteId/quickbooks', quoteIdRule(), validate, asyncHandler(syncToQuickBooks));

// Quote item endpoints
router.put('/products', addProductRules(), validate, asyncHandler(addProduct));
router.put('/products/qty', adjustQtyRules(), validate, asyncHandler(adjustQty));

// Scan product into quote by barcode
router.put('/products/scan', scanRules(), validate, asyncHandler(scanProduct));

// Bulk delete quotes
router.post('/bulk-delete', bulkDeleteRules(), validate, asyncHandler(bulkDeleteQuotes));

export default router;