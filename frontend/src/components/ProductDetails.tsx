import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import AdjustQuantityButton from './AdjustQuantityButton';
import SaveForLaterButton from './SaveForLaterButton';

interface ProductDetailsProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productDetails: {
    SKU: string;
    pickingQty: number;
    originalQty: number;
    qtyOnHand: number;
    pickingStatus: string;
  };
  adjustProductQtyButton: (productName: string, newQty: number) => Promise<void>;
  saveForLaterButton: (productName: string) => Promise<{ message: string }>;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ 
  open, 
  onClose, 
  productName, 
  productDetails, 
  adjustProductQtyButton, 
  saveForLaterButton 
}) => {
  const [localProductDetails, setLocalProductDetails] = useState(productDetails);

  useEffect(() => {
    setLocalProductDetails(productDetails);
  }, [productDetails]);

  const handleStatusChange = (newStatus: string) => {
    setLocalProductDetails(prev => ({ ...prev, pickingStatus: newStatus }));
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Product Details</DialogTitle>
      <DialogContent>
        <Typography variant="h6">{productName}</Typography>
        <Typography>SKU: {localProductDetails.SKU}</Typography>
        <Typography>Picking Quantity: {localProductDetails.pickingQty}</Typography>
        <Typography>Original Quantity: {localProductDetails.originalQty}</Typography>
        <Typography>Quantity On Hand: {localProductDetails.qtyOnHand}</Typography>
        <Typography>Picking Status: {localProductDetails.pickingStatus}</Typography>
      </DialogContent>
      <DialogActions>
        <SaveForLaterButton
          productName={productName}
          currentStatus={localProductDetails.pickingStatus}
          saveForLaterButton={saveForLaterButton}
          onStatusChange={handleStatusChange}
        />
        <AdjustQuantityButton
          productName={productName}
          currentQty={localProductDetails.pickingQty}
          adjustProductQtyButton={adjustProductQtyButton}
        />
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetails;