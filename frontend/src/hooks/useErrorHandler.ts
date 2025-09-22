import { useSnackbarContext } from '../components/SnackbarContext';
import { formatErrorMessage, getErrorSeverity, logError, ErrorContext } from '../utils/errorHandling';

/**
 * Custom hook for consistent error handling with snackbars
 * Provides a standardized way to handle errors across the application
 */
export const useErrorHandler = () => {
  const { handleOpenSnackbar } = useSnackbarContext();

  /**
   * Shows an error message in a snackbar with proper error extraction
   * @param error - The error object to display
   * @param context - Optional context information for better error messages
   * @param fallback - Fallback message if error extraction fails
   */
  const showError = (error: unknown, context?: ErrorContext, fallback: string = 'An error occurred') => {
    const errorMessage = formatErrorMessage(error, context, fallback);
    const severity = getErrorSeverity(error);
    
    // Log error for debugging
    logError(error, context);
    
    handleOpenSnackbar(errorMessage, severity);
  };

  /**
   * Shows a success message in a snackbar
   * @param message - The success message to display
   */
  const showSuccess = (message: string) => {
    handleOpenSnackbar(message, 'success');
  };

  /**
   * Shows an info message in a snackbar
   * @param message - The info message to display
   */
  const showInfo = (message: string) => {
    handleOpenSnackbar(message, 'info');
  };

  /**
   * Shows a warning message in a snackbar
   * @param message - The warning message to display
   */
  const showWarning = (message: string) => {
    handleOpenSnackbar(message, 'warning');
  };

  return {
    showError,
    showSuccess,
    showInfo,
    showWarning,
  };
};
