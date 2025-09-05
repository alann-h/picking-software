import { useState, useCallback } from 'react';
import { useSnackbarContext } from '../components/SnackbarContext';

interface LoginError {
  message: string;
  code?: string;
  field?: string;
}

interface UseLoginErrorReturn {
  error: LoginError | null;
  setError: (error: LoginError | null) => void;
  clearError: () => void;
  handleLoginError: (error: unknown) => void;
  isError: boolean;
}

export const useLoginError = (): UseLoginErrorReturn => {
  const [error, setError] = useState<LoginError | null>(null);
  const { handleOpenSnackbar } = useSnackbarContext();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleLoginError = useCallback((error: unknown) => {
    console.error('Login error:', error);
    
    let errorMessage = 'An unexpected error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    let field: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('Invalid email or password')) {
        errorCode = 'INVALID_CREDENTIALS';
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Account temporarily locked')) {
        errorCode = 'ACCOUNT_LOCKED';
        errorMessage = 'Account temporarily locked due to multiple failed attempts. Please try again later.';
      } else if (error.message.includes('Network')) {
        errorCode = 'NETWORK_ERROR';
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('email')) {
        errorCode = 'EMAIL_ERROR';
        field = 'email';
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('password')) {
        errorCode = 'PASSWORD_ERROR';
        field = 'password';
        errorMessage = 'Password is required.';
      }
    }

    const loginError: LoginError = {
      message: errorMessage,
      code: errorCode,
      field
    };

    setError(loginError);
    
    // Show user-friendly snackbar message
    handleOpenSnackbar(errorMessage, 'error');
  }, [handleOpenSnackbar]);

  return {
    error,
    setError,
    clearError,
    handleLoginError,
    isError: error !== null
  };
};
