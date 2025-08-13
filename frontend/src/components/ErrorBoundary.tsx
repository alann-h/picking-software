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

      return (
        <Box textAlign="center" p={3} sx={{ border: '2px dashed', borderColor: 'error.main', borderRadius: 2 }}>
            <ErrorOutline sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography color="error.main" variant="h6">Something Went Wrong</Typography>
            <Typography color="text.secondary">{error.message}</Typography>
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