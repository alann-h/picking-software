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
        .isInt({ gt: 0 }).withMessage('Each Quote ID in the array must be a positive integer.'),

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
        .isInt({ gt: 0 }).withMessage('Each Quote ID in the array must be a positive integer.')
];

export { validate };