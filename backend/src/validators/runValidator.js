import { body, param } from 'express-validator';
import { validate } from './authValidator.js';

// Reusable validation for run ID
export const runIdRule = () => [
    param('runId')
        .exists().withMessage('Run ID is required.')
        .isUUID().withMessage('Run ID must be a valid UUID.')
];

export const companyIdRule = () => [
    param('companyId')
        .exists().withMessage('Company ID is required.')
        .isString().notEmpty().withMessage('Company ID cannot be empty.')
];

export const runCreateRules = () => [
    body('orderedQuoteIds')
        .exists().withMessage('An array of Quote IDs is required.')
        .isArray({ min: 1 }).withMessage('orderedQuoteIds must be an array with at least one quote.'),
    
    body('orderedQuoteIds.*')
        .isInt({ gt: 0 }).withMessage('Each Quote ID in the array must be a positive integer.'),

    body('companyId')
        .exists().withMessage('Company ID is required.')
        .isString().notEmpty().withMessage('Company ID cannot be empty.')
];

export const runStatusUpdateRules = () => [
    body('status')
        .exists().withMessage('Status is required.')
        .isIn(['pending', 'checking', 'finalised']).withMessage('Invalid status. Must be "pending", "checking", or "finalised".')
];

export const runUpdateRules = () => [
    param('runId')
        .exists().withMessage('Run ID is required in the URL.')
        .isInt({ gt: 0 }).withMessage('Run ID must be a positive integer.'),

    body('orderedQuoteIds')
        .exists().withMessage('An array of Quote IDs is required.')
        .isArray().withMessage('orderedQuoteIds must be an array (it can be empty).'),
    
    body('orderedQuoteIds.*')
        .isInt({ gt: 0 }).withMessage('Each Quote ID in the array must be a positive integer.')
];


export { validate };