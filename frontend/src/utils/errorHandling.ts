import { extractErrorMessage } from './apiHelpers';

/**
 * Enhanced error handling utilities for consistent error display across the application
 */

export interface ErrorContext {
  operation?: string;
  component?: string;
  userId?: string;
  timestamp?: string;
}

/**
 * Formats an error message with optional context information
 * @param error - The error object to format
 * @param context - Optional context information
 * @param fallback - Fallback message if error extraction fails
 * @returns A formatted error message
 */
export const formatErrorMessage = (
  error: unknown, 
  context?: ErrorContext, 
  fallback: string = 'An error occurred'
): string => {
  const baseMessage = extractErrorMessage(error, fallback);
  
  if (context?.operation) {
    return `${context.operation}: ${baseMessage}`;
  }
  
  return baseMessage;
};

/**
 * Determines if an error requires user re-authentication
 * @param error - The error object to check
 * @returns True if re-authentication is required
 */
export const requiresReAuth = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  
  return message.includes('re-authentication required') ||
         message.includes('token expired') ||
         message.includes('token invalid') ||
         message.includes('session expired') ||
         message.includes('authentication failed');
};

/**
 * Determines if an error is a network/connection issue
 * @param error - The error object to check
 * @returns True if it's a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  
  return message.includes('network error') ||
         message.includes('connection failed') ||
         message.includes('timeout') ||
         message.includes('fetch failed');
};

/**
 * Determines if an error is a validation error
 * @param error - The error object to check
 * @returns True if it's a validation error
 */
export const isValidationError = (error: unknown): boolean => {
  const message = extractErrorMessage(error).toLowerCase();
  
  return message.includes('validation error') ||
         message.includes('invalid input') ||
         message.includes('required field') ||
         message.includes('format error');
};

/**
 * Gets appropriate error severity based on error type
 * @param error - The error object to analyze
 * @returns The appropriate severity level
 */
export const getErrorSeverity = (error: unknown): 'error' | 'warning' | 'info' => {
  if (requiresReAuth(error)) {
    return 'warning';
  }
  
  if (isValidationError(error)) {
    return 'warning';
  }
  
  if (isNetworkError(error)) {
    return 'error';
  }
  
  return 'error';
};

/**
 * Logs error details for debugging purposes
 * @param error - The error object to log
 * @param context - Optional context information
 */
export const logError = (error: unknown, context?: ErrorContext): void => {
  const message = extractErrorMessage(error);
  const errorDetails = {
    message,
    context,
    timestamp: new Date().toISOString(),
    errorType: error?.constructor?.name || 'Unknown',
    stack: error instanceof Error ? error.stack : undefined
  };
  
  console.error('Application Error:', errorDetails);
  
  // In production, you might want to send this to an error tracking service
  // like Sentry, LogRocket, etc.
};
