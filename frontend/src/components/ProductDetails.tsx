import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import AdjustQuantityButton from './AdjustQuantityButton';

interface ProductDetailsProps {
    open: boolean;
    onClose: () => void;
    productName: string;
    productDetails: {
      SKU: string;
      pickingQty: number;
      originalQty: number;
      qtyOnHand: number;
    };
    adjustProductQtyButton: (productName: string, newQty: number) => Promise<void>;
  }
  
  const ProductDetails: React.FC<ProductDetailsProps> = ({ open, onClose, productName, productDetails, adjustProductQtyButton }) => {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          <Typography variant="h6">{productName}</Typography>
          <Typography>SKU: {productDetails.SKU}</Typography>
          <Typography>Picking Quantity: {productDetails.pickingQty}</Typography>
          <Typography>Original Quantity: {productDetails.originalQty}</Typography>
          <Typography>Quantity On Hand: {productDetails.qtyOnHand}</Typography>
        </DialogContent>
        <DialogActions>
        <AdjustQuantityButton 
          productName={productName}
          currentQty={productDetails.pickingQty}
          adjustProductQtyButton={adjustProductQtyButton}
        />
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

export default ProductDetails;