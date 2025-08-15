import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Chip,
  Grid,
  useTheme,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Assignment as AssignmentIcon,
  QrCode as QrCodeIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { ProductDetail } from '../utils/types';
import { getStatusColor } from '../utils/other';

interface ProductDetailsProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productDetails: ProductDetail;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  open,
  onClose,
  productName,
  productDetails,
}) => {
  const [localProductDetails, setLocalProductDetails] = useState(productDetails);
  const theme = useTheme();

  useEffect(() => {
    setLocalProductDetails(productDetails);
  }, [productDetails]);

  const getQuantityProgress = () => {
    const percentage = (localProductDetails.pickingQty / localProductDetails.originalQty) * 100;
    return Math.min(percentage, 100);
  };

  const getQuantityColor = () => {
    if (localProductDetails.pickingQty === localProductDetails.originalQty) {
      return theme.palette.success.main;
    } else if (localProductDetails.pickingQty > 0) {
      return theme.palette.warning.main;
    }
    return theme.palette.text.secondary;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[24]
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          bgcolor: theme.palette.primary.main, 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pr: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon />
          <Typography variant="h6" fontWeight={600}>
            Product Details
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Product Name Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            color="primary"
            sx={{ 
              fontWeight: 700,
              mb: 1
            }}
          >
            {productName}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontStyle: 'italic' }}
          >
            Product Information & Status
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Main Product Information */}
        <Grid container spacing={3}>
          {/* Left Column - Basic Info */}
          <Grid size={{xs: 12, md: 6}}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2.5, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Basic Information
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box display="flex" alignItems="center">
                  <AssignmentIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      SKU
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {localProductDetails.sku}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center">
                  <QrCodeIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Barcode
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                      {localProductDetails.barcode ? localProductDetails.barcode : 'No barcode assigned'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Quantity Info */}
          <Grid size={{xs: 12, md: 6}}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2.5, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Quantity Details
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box display="flex" alignItems="center">
                  <InventoryIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      On Hand
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {localProductDetails.qtyOnHand}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center">
                  <ShippingIcon sx={{ mr: 2, color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      Picking Progress
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body1" 
                        fontWeight={600}
                        sx={{ color: getQuantityColor() }}
                      >
                        {localProductDetails.pickingQty}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        / {localProductDetails.originalQty}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Status Section */}
        <Box sx={{ mt: 3 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2.5, 
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              bgcolor: theme.palette.background.default
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InfoIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Current Status
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={localProductDetails.pickingStatus}
                size="medium"
                sx={{
                  bgcolor: getStatusColor(localProductDetails.pickingStatus),
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  px: 2,
                  py: 1
                }}
              />
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Progress: {getQuantityProgress().toFixed(1)}%
                </Typography>
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 8, 
                    bgcolor: theme.palette.divider, 
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      width: `${getQuantityProgress()}%`, 
                      height: '100%', 
                      bgcolor: getQuantityColor(),
                      transition: 'width 0.3s ease-in-out'
                    }} 
                  />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          color="primary"
          size="large"
          sx={{ 
            px: 4,
            py: 1.5,
            borderRadius: 2,
            fontWeight: 600
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetails;