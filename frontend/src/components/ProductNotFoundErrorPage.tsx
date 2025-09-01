import React from 'react';
import { Typography, Box, Alert, AlertTitle, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ApiErrorWrapper } from '../utils/types';

interface Props {
  errorData: ApiErrorWrapper;
}

const ProductNotFoundErrorPage: React.FC<Props> = ({ errorData }) => {
  const { message, productName } = errorData.data;

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" icon={<ErrorOutlineIcon fontSize="inherit" />} sx={{ width: '100%' }}>
        <AlertTitle sx={{ fontWeight: 'bold' }}>Failed to Load Quote Content</AlertTitle>
        <Typography variant="body1" gutterBottom>
          {message}
        </Typography>
        {productName && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Problematic Product:</strong> {productName}
          </Typography>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          Please ensure this product exists in the database and then refresh the page.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={handleGoBack}
            startIcon={<ArrowBackIcon />}
          >
            Go Back
          </Button>
        </Box>
      </Alert>
    </Box>
  );
};

export default ProductNotFoundErrorPage;