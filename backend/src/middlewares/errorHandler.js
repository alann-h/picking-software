import { getErrorDetails, AUTH_ERROR_CODES } from '../constants/errorCodes.js';

export class HttpError extends Error {
  constructor (message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class InputError extends HttpError {
  constructor (message, errorCode = AUTH_ERROR_CODES.VALIDATION_ERROR) {
    super(message, 400, errorCode); // Bad Request
  }
}

export class NotFoundError extends HttpError {
  constructor (message, errorCode = AUTH_ERROR_CODES.NOT_FOUND) {
    super(message, 404, errorCode); // Not Found
  }
}

export class AuthenticationError extends HttpError {
  constructor (errorCode = AUTH_ERROR_CODES.INVALID_CREDENTIALS, customMessage = null) {
    const errorDetails = getErrorDetails(errorCode, customMessage);
    super(errorDetails.message, errorDetails.statusCode, errorDetails.code);
    this.timestamp = errorDetails.timestamp;
  }
}

export class AccessError extends HttpError {
  constructor (errorCode = AUTH_ERROR_CODES.PERMISSION_DENIED, customMessage = null) {
    const errorDetails = getErrorDetails(errorCode, customMessage);
    super(errorDetails.message, errorDetails.statusCode, errorDetails.code);
    this.timestamp = errorDetails.timestamp;
  }
}

export default (err, req, res, _next) => {
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    errorCode: err.errorCode,
    statusCode: err.statusCode,
    stack: err.stack,
    timestamp: err.timestamp || new Date().toISOString()
  });

  // Use consistent error response format
  const errorResponse = {
    error: {
      message: err.message || 'Internal Server Error',
      code: err.errorCode || 'INTERNAL_ERROR',
      timestamp: err.timestamp || new Date().toISOString()
    }
  };

  // Add additional context for development
  if (process.env.VITE_APP_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.name = err.name;
  }

  res.status(err.statusCode || 500).json(errorResponse);
};
