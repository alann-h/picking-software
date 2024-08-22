import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import AdjustQuantityButton from './AdjustQuantityButton';
import SaveForLaterButton from './SaveForLaterButton';

interface ProductDetailsProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productDetails: {
    sku: string;
    pickingQty: number;
    originalQty: number;
    qtyOnHand: number;
    pickingStatus: string;
    productId: number;
  };
  adjustProductQtyButton: (productId: number, newQty: number) => Promise<void>;
  saveForLaterButton: (productId: number) => Promise<{ message: string }>;
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
        <Typography>SKU: {localProductDetails.sku}</Typography>
        <Typography>Picking Quantity: {localProductDetails.pickingQty}</Typography>
        <Typography>Original Quantity: {localProductDetails.originalQty}</Typography>
        <Typography>Quantity On Hand: {localProductDetails.qtyOnHand}</Typography>
        <Typography>Picking Status: {localProductDetails.pickingStatus}</Typography>
      </DialogContent>
      <DialogActions>
        <SaveForLaterButton
          productId={localProductDetails.productId}
          currentStatus={localProductDetails.pickingStatus}
          saveForLaterButton={saveForLaterButton}
          onStatusChange={handleStatusChange}
        />
        <AdjustQuantityButton
          productName={productName}
          currentQty={localProductDetails.pickingQty}
          productId={localProductDetails.productId}
          adjustProductQtyButton={adjustProductQtyButton}
        />
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductDetails;