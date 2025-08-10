'use client'; // This component must be a client component

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service here
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box textAlign="center" p={3} sx={{ border: '2px dashed', borderColor: 'error.main', borderRadius: 2 }}>
            <ErrorOutline sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography color="error.main" variant="h6">Something went wrong.</Typography>
            <Typography color="text.secondary">Failed to load the active runs.</Typography>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;