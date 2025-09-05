import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Container,
  Stack
} from '@mui/material';
import { 
  ErrorOutline, 
  Refresh,
  Login as LoginIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface LoginErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface LoginErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class LoginErrorBoundary extends Component<LoginErrorBoundaryProps, LoginErrorBoundaryState> {
  public state: LoginErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): LoginErrorBoundaryState {
    return { hasError: true, error: error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Login ErrorBoundary caught an error:", error, errorInfo);
    
    // Log to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error reporting service (e.g., Sentry, LogRocket)
      console.log('Error logged to reporting service:', error);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    const { hasError, error } = this.state;

    if (hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
            px: 2
          }}
        >
          <Container component="main" maxWidth="sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Paper
                elevation={8}
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 20px 40px rgba(30, 64, 175, 0.15)',
                  textAlign: 'center'
                }}
              >
                <Stack spacing={3} alignItems="center">
                  <ErrorOutline 
                    sx={{ 
                      fontSize: 64, 
                      color: 'error.main',
                      opacity: 0.8
                    }} 
                  />
                  
                  <Box>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1
                      }}
                    >
                      Login Error
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Something went wrong while loading the login page
                    </Typography>
                  </Box>

                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'error.light', 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'error.main',
                    width: '100%'
                  }}>
                    <Typography variant="body2" color="error.dark" sx={{ fontFamily: 'monospace' }}>
                      {error?.message || 'An unexpected error occurred'}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                    <Button
                      variant="contained"
                      startIcon={<Refresh />}
                      onClick={this.handleRetry}
                      sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
                        }
                      }}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<LoginIcon />}
                      onClick={this.handleReload}
                      sx={{ flex: 1 }}
                    >
                      Reload Page
                    </Button>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    If this problem persists, please contact support
                  </Typography>
                </Stack>
              </Paper>
            </motion.div>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default LoginErrorBoundary;
