import { body, param } from 'express-validator';
import { validate } from './authValidator.js'; // Reuse the error handler

// --- Define Rules for Each Route ---

// For any route with a :productId in the URL
export const productIdRule = () => [
  param('productId').custom((value) => {
    // Accept both integers and strings that can be converted to positive integers
    const numValue = Number(value);
    if (Number.isInteger(numValue) && numValue > 0) {
      return true;
    }
    throw new Error('Product ID must be a positive integer.');
  }),
];

// For the barcode lookup route
export const barcodeRule = () => [
  param('barcode').notEmpty().withMessage('Barcode cannot be empty.').trim().escape(),
];

// For adding a new product
export const addProductRules = () => [
  body('productName').notEmpty().withMessage('Product name is required.').trim().escape(),
  body('sku').notEmpty().withMessage('Product SKU is required').trim().escape(),
  body('barcode').optional().trim().escape(),
];

// For updating a product
export const updateProductRules = () => [
  param('productId').custom((value) => {
    // Accept both integers and strings that can be converted to positive integers
    const numValue = Number(value);
    if (Number.isInteger(numValue) && numValue > 0) {
      return true;
    }
    throw new Error('Product ID must be a positive integer.');
  }),
  body('productName').optional().trim().escape(),
  body('sku').optional().trim().escape(),
  body('barcode').optional().trim().escape(),
];

// For routes that link a product to a quote
export const quoteProductRules = () => [
    body('quoteId').custom((value) => {
      // Accept both integers (QBO) and strings (Xero UUIDs)
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        return true;
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        return true;
      }
      throw new Error('Quote ID must be a positive integer or a non-empty string.');
    }),
    body('productId').custom((value) => {
      // Accept both integers and strings that can be converted to positive integers
      const numValue = Number(value);
      if (Number.isInteger(numValue) && numValue > 0) {
        return true;
      }
      throw new Error('Product ID must be a positive integer.');
    }),
];

export const setArchiveStatusRules = () => [
  param('productId').custom((value) => {
    // Accept both integers and strings that can be converted to positive integers
    const numValue = Number(value);
    if (Number.isInteger(numValue) && numValue > 0) {
      return true;
    }
    throw new Error('Product ID must be a positive integer.');
  }),
  body('isArchived').isBoolean().withMessage('The "isArchived" status must be a boolean (true or false).'),
];

// Export the generic error handler
export { validate };