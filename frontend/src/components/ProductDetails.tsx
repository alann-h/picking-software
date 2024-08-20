import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { ProductDetailsDB } from '../utils/types';
interface ProductDetailsProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productDetails: ProductDetailsDB
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ 
  open, 
  onClose, 
  productName, 
  productDetails
}) => {
  const [localProductDetails, setLocalProductDetails] = useState(productDetails);

  useEffect(() => {
    setLocalProductDetails(productDetails);
  }, [productDetails]);



  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Product Details</DialogTitle>
      <DialogContent>
        <Typography variant="h6">{productName}</Typography>
        <Typography>SKU: {localProductDetails.sku}</Typography>
        <Typography>Picking Quantity: {localProductDetails.pickingQty}</Typography>
        <Typography>Original Quantity: {localProductDetails.originalQty}</Typography>
        <Typography>Quantity On Hand: {localProductDetails.qtyOnHand}</Typography>
        <Typography>Picking Status: {localProductDetails.pickingStatus}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetails;