import { body, param, validationResult } from 'express-validator';

// Middleware to handle the result of the validations
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map(err => ({ [err.path]: err.msg }));
  
  return res.status(422).json({
    errors: extractedErrors,
  });
};

// --- Define Rules for Each Route ---

export const loginRules = () => [
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .trim().normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password cannot be empty')
    .trim(),
];

export const registerRules = () => [
  body('givenName')
    .notEmpty().withMessage('First name is required')
    .trim().escape(),
  body('familyName')
    .optional().trim().escape(),
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .trim(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a symbol')
    .trim(),
  body('isAdmin')
    .isBoolean().withMessage('isAdmin must be a boolean value'),
];

export const userIdRules = () => [
  param('userId').isUUID().withMessage('Invalid user ID format'),
];

export const updateUserRules = () => [
  param('userId').isUUID().withMessage('Invalid user ID format'),
  body('givenName').optional().trim().escape(),
  body('familyName').optional().trim().escape(),
  body('email')
    .optional()
    .isEmail().withMessage('Must be a valid email address')
    .trim(),
  body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean'),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a symbol')
    .trim(),
];