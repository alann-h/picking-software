import React from 'react';
import { Typography, Box, Alert, AlertTitle } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { ApiError } from '../utils/types'; // Import the error type

interface Props {
  error: ApiError;
}

const ProductNotFoundErrorPage: React.FC<Props> = ({ error }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />} sx={{ width: '100%' }}>
        <AlertTitle sx={{ fontWeight: 'bold' }}>Failed to Load Quote Content</AlertTitle>
        <Typography variant="body1" gutterBottom>
          {error.message}
        </Typography>
        {error.productName && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Problematic Product:</strong> {error.productName}
          </Typography>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Please ensure this product exists in the database and then refresh the page.
        </Typography>
      </Alert>
    </Box>
  );
};

export default ProductNotFoundErrorPage;