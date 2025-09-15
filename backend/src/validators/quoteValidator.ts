import { body, param, query } from 'express-validator';
import { validate } from './authValidator.js';

// --- Define Rules for Each Route ---

// Reusable quote ID validation function
const validateQuoteId = (field: string) => {
  return body(field)
    .custom((value) => {
      // Check if it's a valid integer (QBO format) or UUID (Xero format)
      const isInt = /^\d+$/.test(value) && parseInt(value) > 0;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      
      if (!isInt && !isUUID) {
        throw new Error(`${field} must be a positive integer (QBO) or valid UUID (Xero).`);
      }
      return true;
    });
};

export const quoteIdRule = () => [
  param('quoteId')
    .custom((value) => {
      // Check if it's a valid integer (QBO format) or UUID (Xero format)
      const isInt = /^\d+$/.test(value) && parseInt(value) > 0;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      
      if (!isInt && !isUUID) {
        throw new Error('Quote ID must be a positive integer (QBO) or valid UUID (Xero).');
      }
      return true;
    }),
];

export const customerIdRule = () => [
  param('customerId')
    .custom((value) => {
      // Check if it's a valid integer (QBO format) or UUID (Xero format)
      const isInt = /^\d+$/.test(value) && parseInt(value) > 0;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      
      if (!isInt && !isUUID) {
        throw new Error('Customer ID must be a positive integer (QBO) or valid UUID (Xero).');
      }
      return true;
    }),
];

// NEW: For GET /quotes?status=...
export const listQuotesRules = () => [
  query('status').optional().isIn(['pending', 'checking', 'finalised', 'all'])
    .withMessage('Invalid status provided.'),
];

export const updateStatusRules = () => [
  validateQuoteId('quoteId'),
  body('newStatus').isIn(['pending', 'checking', 'finalised'])
    .withMessage('Invalid status provided.'),
];

export const pickerNoteRules = () => [
    validateQuoteId('quoteId'),
    body('note').trim().escape(),
];

export const addProductRules = () => [
  validateQuoteId('quoteId'),
  body('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer.'),
  body('qty').notEmpty().withMessage('Quantity is required.').isFloat({ gt: 0 }).withMessage('Quantity must be a number greater than 0.')
    .customSanitizer(value => {
        return parseFloat(parseFloat(value).toFixed(2));
    })
];

// NEW: Separate rule for adjusting quantity
export const adjustQtyRules = () => [
    validateQuoteId('quoteId'),
    body('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer.'),
    body('newQty').notEmpty().withMessage('New quantity is required.').isFloat({ min: 0 }).withMessage('Quantity must be a positive number.')
    .customSanitizer(value => {
        return parseFloat(parseFloat(value).toFixed(2));
    })
];

export const scanRules = () => [
  validateQuoteId('quoteId'),
  body('barcode').notEmpty().withMessage('Barcode cannot be empty.').trim().escape(),
  body('newQty').notEmpty().withMessage('New quantity is required.').isFloat({ gt: 0 }).withMessage('Quantity must be a number greater than 0.')
    .customSanitizer(value => {
        return parseFloat(parseFloat(value).toFixed(2));
    })
];

export const bulkDeleteRules = () => [
  body('quoteIds')
    .isArray({ min: 1 })
    .withMessage('Quote IDs must be an array with at least one element.'),
  body('quoteIds.*')
    .custom((value) => {
      // Check if it's a valid integer (QBO format) or UUID (Xero format)
      const isInt = /^\d+$/.test(value) && parseInt(value) > 0;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      
      if (!isInt && !isUUID) {
        throw new Error('Each quote ID must be a positive integer (QBO) or valid UUID (Xero).');
      }
      return true;
    }),
];

export { validate };