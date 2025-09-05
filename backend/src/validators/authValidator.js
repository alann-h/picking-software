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
  body('given_name').optional().trim().escape(),
  body('family_name').optional().trim().escape(),
  body('display_email')
    .optional()
    .isEmail().withMessage('Must be a valid email address')
    .trim(),
  body('is_admin').optional().isBoolean().withMessage('is_admin must be a boolean'),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a symbol')
    .trim(),
];

// Reusable validation rules for company IDs
export const companyIdRule = () => [
  param('companyId')
    .exists().withMessage('Company ID is required.')
    .isUUID().withMessage('Company ID must be a valid UUID.')
];

export const companyIdBodyRule = () => [
  body('companyId')
    .exists().withMessage('Company ID is required.')
    .isUUID().withMessage('Company ID must be a valid UUID.')
];

export const forgotPasswordRules = () => [
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .trim().normalizeEmail(),
];

export const resetPasswordRules = () => [
  body('token')
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 64, max: 64 }).withMessage('Invalid reset token format')
    .matches(/^[a-f0-9]+$/i).withMessage('Invalid reset token format'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a symbol')
    .trim(),
];