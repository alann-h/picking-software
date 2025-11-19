// src/routes/quoteRoutes.js
import { Router } from 'express';
import asyncHandler from '../middlewares/asyncHandler.js';
import { isAuthenticated } from '../middlewares/authMiddleware.js';
import {
  getEstimates,
  getEstimateById,
  listQuotes,
  updateStatus,
  syncToAccountingService,
  addProduct,
  adjustQty,
  scanProduct,
  savePickerNoteController,
  bulkDeleteQuotes,
  getBackorderQuotes
} from '../controllers/quoteController.js';

import {
  uploadKyteCSV,
  getCustomersForMapping,
  createQuickBooksEstimates,
  getConversionHistoryController
} from '../controllers/kyteConverterController.js';

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

import {
  csvContentRule,
  ordersRule,
  orderCustomerRule,
} from '../validators/kyteConverterValidator.js';

const router = Router();
router.use(isAuthenticated);

// Kyte to QuickBooks Converter endpoints
router.post('/kyte-upload', csvContentRule(), validate, asyncHandler(uploadKyteCSV));
router.get('/kyte-customers', asyncHandler(getCustomersForMapping));
router.get('/kyte-history', asyncHandler(getConversionHistoryController));
router.post('/kyte-create-estimates', [ordersRule(), orderCustomerRule()], validate, asyncHandler(createQuickBooksEstimates));

// List and update quotes - must come before parameterized routes
router.get('/', listQuotesRules(), validate, asyncHandler(listQuotes));
router.get('/backorders', asyncHandler(getBackorderQuotes));

// Estimate endpoints
router.get('/customer/:customerId', customerIdRule(), validate, asyncHandler(getEstimates));
router.get('/:quoteId', quoteIdRule(), validate, asyncHandler(getEstimateById));
router.put('/status', updateStatusRules(), validate, asyncHandler(updateStatus));
router.put('/picker-note', pickerNoteRules(), validate, asyncHandler(savePickerNoteController));
// Sync with accounting service (QuickBooks or Xero)
router.put('/:quoteId/sync', quoteIdRule(), validate, asyncHandler(syncToAccountingService));

// Quote item endpoints
router.put('/products', addProductRules(), validate, asyncHandler(addProduct));
router.put('/products/qty', adjustQtyRules(), validate, asyncHandler(adjustQty));

// Scan product into quote by barcode
router.put('/products/scan', scanRules(), validate, asyncHandler(scanProduct));

// Bulk delete quotes
router.post('/bulk-delete', bulkDeleteRules(), validate, asyncHandler(bulkDeleteQuotes));

export default router;