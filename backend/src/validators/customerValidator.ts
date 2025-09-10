import { body } from 'express-validator';
import { validate } from './authValidator.js'; // Reuse the error handler

/**
 * Rules for saving a list of customers.
 * This validator now checks for the simplified customer object structure.
 */
export const saveCustomersRules = () => [
  // 1. Check that the root body is an array.
  body().isArray().withMessage('Request body must be an array of customers.'),

  // 2. Validate fields for each object in the array using the wildcard '*'.
  body('*.customerId')
    .notEmpty().withMessage('customerId is required.')
    .isInt({ min: 1 }).withMessage('customerId must be a positive integer.'),

  body('*.customerName')
    .notEmpty().withMessage('customerName is required.')
    .trim()
    .escape(),
];

export { validate };