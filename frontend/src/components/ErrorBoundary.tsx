'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

import ProductNotFoundErrorPage from './ProductNotFoundErrorPage';
import { HttpError } from '../utils/apiHelpers';
import { ApiErrorWrapper } from '../utils/types';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | HttpError | null; 
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error | HttpError): State {
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  private handleGoBack = () => {
    window.history.back();
  };

  private getErrorMessage = (error: Error | HttpError): string => {
    if (error instanceof HttpError && error.response?.data) {
      const errorData = error.response.data;
      
      // Handle backend error structure: { error: { message: "...", code: "..." } }
      if (errorData.error && typeof errorData.error === 'object') {
        return errorData.error.message || errorData.error.toString();
      }
      
      // Handle direct message property
      if (errorData.message) {
        return errorData.message;
      }
      
      // Handle error property as string
      if (errorData.error && typeof errorData.error === 'string') {
        return errorData.error;
      }
      
      // Fallback to error message
      return error.message || 'An unexpected error occurred';
    }
    
    // For non-HttpError errors, use the error message
    return error.message || 'An unexpected error occurred';
  };

  public render() {
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (error instanceof HttpError && error.response) {
        const status = error.response.status;
        const errorData = error.response.data as ApiErrorWrapper;

        if (status === 404 || status === 409) {
          return <ProductNotFoundErrorPage errorData={errorData} />;
        }
      }

      const errorMessage = this.getErrorMessage(error);

      return (
        <Box textAlign="center" p={3} sx={{ border: '2px dashed', borderColor: 'error.main', borderRadius: 2 }}>
            <ErrorOutline sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography color="error.main" variant="h6">Something Went Wrong</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {errorMessage}
            </Typography>
            {error instanceof HttpError && error.response && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Status: {error.response.status} | Code: {error.response.data?.error?.code || 'Unknown'}
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={this.handleGoBack}>
                Go Back
              </Button>
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;