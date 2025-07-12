import { body, param } from 'express-validator';
import { validate } from './authValidator.js'; // Reuse the error handler

// --- Define Rules for Each Route ---

// For any route with a :productId in the URL
export const productIdRule = () => [
  param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer.'),
];

// For the barcode lookup route
export const barcodeRule = () => [
  param('barcode').notEmpty().withMessage('Barcode cannot be empty.').trim().escape(),
];

// For adding a new product
export const addProductRules = () => [
  body('productName').notEmpty().withMessage('Product name is required.').trim().escape(),
  body('sku').optional().trim().escape(),
  body('barcode').optional().trim().escape(),
];

// For updating a product
export const updateProductRules = () => [
  param('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer.'),
  body('productName').optional().trim().escape(),
  body('sku').optional().trim().escape(),
  body('barcode').optional().trim().escape(),
];

// For routes that link a product to a quote
export const quoteProductRules = () => [
    body('quoteId').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer.'),
    body('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer.'),
];


// Export the generic error handler
export { validate };