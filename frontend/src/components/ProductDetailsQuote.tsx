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
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { ProductDetailsDB } from '../utils/types';

interface ProductDetailsProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productDetails: ProductDetailsDB;
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return theme.palette.success.main;
      case 'pending':
        return theme.palette.grey[500];
      case 'backorder':
        return theme.palette.warning.main;
      case 'unavailable':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
        Product Details
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="h5" gutterBottom color="primary">
          {productName}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center">
              <AssignmentIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
              <Typography variant="body1">SKU: {localProductDetails.sku}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center">
              <InventoryIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
              <Typography variant="body1">Quantity On Hand: {localProductDetails.qtyOnHand}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center">
              <ShippingIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
              <Typography variant="body1">Picking Quantity: {localProductDetails.pickingQty}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box display="flex" alignItems="center">
              <ShippingIcon sx={{ mr: 1, color: theme.palette.text.secondary }} />
              <Typography variant="body1">Original Quantity: {localProductDetails.originalQty}</Typography>
            </Box>
          </Grid>
        </Grid>
        <Box mt={2}>
          <Typography variant="body1" gutterBottom>
            Picking Status:
          </Typography>
          <Chip
            label={localProductDetails.pickingStatus}
            sx={{
              bgcolor: getStatusColor(localProductDetails.pickingStatus),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetails;