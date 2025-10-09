import { body, param } from 'express-validator';
import { validate, companyIdRule, companyIdBodyRule } from './authValidator.js';

// Reusable validation for run ID
export const runIdRule = () => [
    param('runId')
        .exists().withMessage('Run ID is required.')
        .isUUID().withMessage('Run ID must be a valid UUID.')
];

// Use shared company ID validation
export { companyIdRule };

export const runCreateRules = () => [
    body('orderedQuoteIds')
        .exists().withMessage('An array of Quote IDs is required.')
        .isArray({ min: 1 }).withMessage('orderedQuoteIds must be an array with at least one quote.'),
    
    body('orderedQuoteIds.*')
        .custom((value) => {
            // Allow both positive integers and valid UUIDs
            const isPositiveInt = Number.isInteger(value) && value > 0;
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
            
            if (!isPositiveInt && !isUUID) {
                throw new Error('Each Quote ID must be either a positive integer or a valid UUID.');
            }
            return true;
        }),

    body('runName')
        .optional()
        .isString().withMessage('Run name must be a string.')
        .isLength({ min: 1, max: 100 }).withMessage('Run name must be between 1 and 100 characters.')
        .trim(),

    ...companyIdBodyRule()
];

export const runStatusUpdateRules = () => [
    body('status')
        .exists().withMessage('Status is required.')
        .isIn(['pending', 'checking', 'finalised']).withMessage('Invalid status. Must be "pending", "checking", or "finalised".')
];

export const runUpdateRules = () => [
    param('runId')
        .exists().withMessage('Run ID is required in the URL.')
        .isUUID().withMessage('Run ID must be a valid UUID.'),

    body('orderedQuoteIds')
        .exists().withMessage('An array of Quote IDs is required.')
        .isArray().withMessage('orderedQuoteIds must be an array (it can be empty).'),
    
    body('orderedQuoteIds.*')
        .custom((value) => {
            // Allow strings (for QuickBooks/Xero IDs), positive integers, and valid UUIDs
            if (typeof value === 'string' && value.length > 0) {
                return true; // Any non-empty string is valid (QuickBooks/Xero IDs)
            }
            const isPositiveInt = Number.isInteger(value) && value > 0;
            const isUUID = typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
            
            if (!isPositiveInt && !isUUID) {
                throw new Error('Each Quote ID must be a string, positive integer, or valid UUID.');
            }
            return true;
        })
];

export const runNameUpdateRules = () => [
    body('runName')
        .exists().withMessage('Run name is required.')
        .isString().withMessage('Run name must be a string.')
        .isLength({ min: 1, max: 100 }).withMessage('Run name must be between 1 and 100 characters.')
        .trim()
];

export { validate };