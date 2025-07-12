import { body, param, query } from 'express-validator';
import { validate } from './authValidator.js';

// --- Define Rules for Each Route ---

export const quoteIdRule = () => [
  param('quoteId').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer.'),
];

export const customerIdRule = () => [
  param('customerId').isInt({ min: 1 }).withMessage('Customer ID must be a positive integer.'),
];

// NEW: For GET /quotes?status=...
export const listQuotesRules = () => [
  query('status').optional().isIn(['Pending', 'Accepted', 'Rejected', 'In Progress', 'Completed'])
    .withMessage('Invalid status provided.'),
];

export const updateStatusRules = () => [
  body('quoteId').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer.'),
  body('newStatus').isIn(['Pending', 'Accepted', 'Rejected', 'In Progress', 'Completed'])
    .withMessage('Invalid status provided.'),
];

export const pickerNoteRules = () => [
    body('quoteId').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer.'),
    body('note').trim().escape(),
];

export const addProductRules = () => [
  body('quoteId').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer.'),
  body('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer.'),
  body('qty').notEmpty().withMessage('Quantity is required.').isFloat({ gt: 0 }).withMessage('Quantity must be a number greater than 0.')
    .customSanitizer(value => {
        return parseFloat(parseFloat(value).toFixed(2));
    })
];

// NEW: Separate rule for adjusting quantity
export const adjustQtyRules = () => [
    body('quoteId').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer.'),
    body('productId').isInt({ min: 1 }).withMessage('Product ID must be a positive integer.'),
    body('newQty').notEmpty().withMessage('New quantity is required.').isFloat({ min: 0 }).withMessage('Quantity must be a positive number.')
    .customSanitizer(value => {
        return parseFloat(parseFloat(value).toFixed(2));
    })
];

export const scanRules = () => [
  body('quoteId').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer.'),
  body('barcode').notEmpty().withMessage('Barcode cannot be empty.').trim().escape(),
  body('newQty').notEmpty().withMessage('New quantity is required.').isFloat({ gt: 0 }).withMessage('Quantity must be a number greater than 0.')
    .customSanitizer(value => {
        return parseFloat(parseFloat(value).toFixed(2));
    })
];

export { validate };