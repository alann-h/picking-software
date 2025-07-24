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
    body('quoteId')
        .exists().withMessage('Quote ID is required.')
        .isInt({ gt: 0 }).withMessage('Quote ID must be a positive integer.'),
    body('companyId')
        .exists().withMessage('Company ID is required.')
        .isString().notEmpty().withMessage('Company ID cannot be empty.')
];

export const runStatusUpdateRules = () => [
    body('status')
        .exists().withMessage('Status is required.')
        .isIn(['pending', 'checking', 'finalised']).withMessage('Invalid status. Must be "pending", "checking", or "finalised".')
];

export { validate };