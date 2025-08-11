'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

import ProductNotFoundErrorPage from './ProductNotFoundErrorPage';
import { ApiError } from '../utils/types';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | ApiError | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error | ApiError): State {
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private isApiError(error: any): error is ApiError {
    return error && typeof error === 'object' && 'error' in error && error.error === true;
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.isApiError(this.state.error)) {
        return <ProductNotFoundErrorPage error={this.state.error} />;
      }

      return (
        <Box textAlign="center" p={3} sx={{ border: '2px dashed', borderColor: 'error.main', borderRadius: 2 }}>
            <ErrorOutline sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography color="error.main" variant="h6">Something went wrong.</Typography>
            <Typography color="text.secondary">An unexpected error occurred.</Typography>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => window.location.reload()}>
              Reload Page
            </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;