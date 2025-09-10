/**
 * Centralized Error Codes and Messages
 * Provides consistent error handling across the authentication system
 */

// Authentication Error Codes
export const AUTH_ERROR_CODES = {
  // Token-related errors
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  
  // Platform-specific errors
  QBO_REAUTH_REQUIRED: 'QBO_REAUTH_REQUIRED',
  XERO_REAUTH_REQUIRED: 'XERO_REAUTH_REQUIRED',
  MYOB_REAUTH_REQUIRED: 'MYOB_REAUTH_REQUIRED',
  
  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Account security errors
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// Error Messages with consistent formatting
export const ERROR_MESSAGES = {
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Authentication token has expired',
  [AUTH_ERROR_CODES.TOKEN_INVALID]: 'Authentication token is invalid',
  [AUTH_ERROR_CODES.TOKEN_REVOKED]: 'Authentication token has been revoked',
  [AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED]: 'Refresh token has expired, re-authentication required',
  [AUTH_ERROR_CODES.REAUTH_REQUIRED]: 'Re-authentication required for this platform',
  
  [AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED]: 'QuickBooks Online re-authentication required',
  [AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED]: 'Xero re-authentication required',
  [AUTH_ERROR_CODES.MYOB_REAUTH_REQUIRED]: 'MYOB re-authentication required',
  
  [AUTH_ERROR_CODES.CONNECTION_FAILED]: 'Failed to connect to external service',
  [AUTH_ERROR_CODES.API_RATE_LIMIT]: 'API rate limit exceeded, please try again later',
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials provided',
  
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 'Account temporarily locked due to security concerns',
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many failed attempts, please try again later',
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'Session has expired, please log in again',
  
  [AUTH_ERROR_CODES.VALIDATION_ERROR]: 'Validation error occurred',
  [AUTH_ERROR_CODES.NOT_FOUND]: 'Requested resource not found',
  [AUTH_ERROR_CODES.PERMISSION_DENIED]: 'Permission denied for this operation',
  [AUTH_ERROR_CODES.INTERNAL_ERROR]: 'Internal server error occurred'
};

// HTTP Status Code mappings
export const ERROR_STATUS_CODES = {
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 401,
  [AUTH_ERROR_CODES.TOKEN_INVALID]: 401,
  [AUTH_ERROR_CODES.TOKEN_REVOKED]: 401,
  [AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED]: 401,
  [AUTH_ERROR_CODES.REAUTH_REQUIRED]: 401,
  [AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED]: 401,
  [AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED]: 401,
  [AUTH_ERROR_CODES.MYOB_REAUTH_REQUIRED]: 401,
  
  [AUTH_ERROR_CODES.CONNECTION_FAILED]: 502,
  [AUTH_ERROR_CODES.API_RATE_LIMIT]: 429,
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 401,
  
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 423,
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: 429,
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 401,
  
  [AUTH_ERROR_CODES.VALIDATION_ERROR]: 400,
  [AUTH_ERROR_CODES.NOT_FOUND]: 404,
  [AUTH_ERROR_CODES.PERMISSION_DENIED]: 403,
  [AUTH_ERROR_CODES.INTERNAL_ERROR]: 500
};

// Helper function to get error details
export function getErrorDetails(errorCode: string, customMessage: string | null = null) {
  return {
    code: errorCode,
    message: customMessage || ERROR_MESSAGES[errorCode] || 'Unknown error occurred',
    statusCode: ERROR_STATUS_CODES[errorCode] || 500,
    timestamp: new Date().toISOString()
  };
}

// Helper function to check if error requires re-authentication
export function requiresReAuth(errorCode: string) {
  return [
    AUTH_ERROR_CODES.TOKEN_REVOKED,
    AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED,
    AUTH_ERROR_CODES.REAUTH_REQUIRED,
    AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED,
    AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED,
    AUTH_ERROR_CODES.MYOB_REAUTH_REQUIRED
  ].includes(errorCode);
}
