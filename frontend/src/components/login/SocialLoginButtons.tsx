import React from 'react';
import { 
  Button, 
  Box, 
  Typography,
  Divider
} from '@mui/material';
import { 
  ArrowForward
} from '@mui/icons-material';

interface SocialLoginButtonsProps {
  onQuickBooksLogin: () => void;
  onXeroLogin: () => void;
  isSubmitting: boolean;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onQuickBooksLogin,
  onXeroLogin,
  isSubmitting
}) => {
  return (
    <>
      {/* Divider */}
      <Box sx={{ my: 3, display: 'flex', alignItems: 'center' }}>
        <Divider sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
          or continue with
        </Typography>
        <Divider sx={{ flex: 1 }} />
      </Box>

      {/* QuickBooks Login */}
      <Button
        fullWidth
        variant="outlined"
        onClick={onQuickBooksLogin}
        disabled={isSubmitting}
        startIcon={
          <img
            src="/quickbooks-logo.svg"
            alt="QuickBooks"
            style={{
              width: 24,
              height: 24,
              objectFit: 'contain',
              marginRight: '8px'
            }}
          />
        }
        endIcon={<ArrowForward />}
        sx={{
          py: 1.5,
          px: 2,
          borderRadius: 2,
          borderColor: '#10B981',
          color: '#10B981',
          fontSize: '1.1rem',
          fontWeight: 600,
          textTransform: 'none',
          minHeight: '48px',
          '& .MuiButton-startIcon': {
            marginRight: '12px',
            marginLeft: 0
          },
          '& .MuiButton-endIcon': {
            marginLeft: '12px',
            marginRight: 0
          },
          '&:hover': {
            borderColor: '#059669',
            backgroundColor: 'rgba(16, 185, 129, 0.04)',
            transform: 'translateY(-1px)',
          },
          '&:disabled': {
            borderColor: '#E5E7EB',
            color: '#9CA3AF',
            transform: 'none',
          }
        }}
      >
        Sign in with QuickBooks
      </Button>

      {/* Xero Login */}
      <Button
        fullWidth
        variant="outlined"
        onClick={onXeroLogin}
        disabled={isSubmitting}
        startIcon={
          <img
            src="/xero-logo.svg"
            alt="Xero"
            style={{
              width: 24,
              height: 24,
              objectFit: 'contain',
              marginRight: '8px'
            }}
          />
        }
        endIcon={<ArrowForward />}
        sx={{
          py: 1.5,
          px: 2,
          borderRadius: 2,
          borderColor: '#13B5EA',
          color: '#13B5EA',
          fontSize: '1.1rem',
          fontWeight: 600,
          textTransform: 'none',
          mt: 2,
          minHeight: '48px',
          '& .MuiButton-startIcon': {
            marginRight: '12px',
            marginLeft: 0
          },
          '& .MuiButton-endIcon': {
            marginLeft: '12px',
            marginRight: 0
          },
          '&:hover': {
            borderColor: '#0EA5D9',
            backgroundColor: 'rgba(19, 181, 234, 0.04)',
            transform: 'translateY(-1px)',
          },
          '&:disabled': {
            borderColor: '#E5E7EB',
            color: '#9CA3AF',
            transform: 'none',
          }
        }}
      >
        Sign in with Xero
      </Button>
    </>
  );
};

export default SocialLoginButtons;
