import React from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  height?: string | number;
  fallback?: React.ReactNode;
}

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({ 
  isLoading, 
  children, 
  height = '100vh',
  fallback 
}) => {
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <CircularProgress />
      </Box>
    );
  }
  return <>{children}</>;
};

export default LoadingWrapper;
