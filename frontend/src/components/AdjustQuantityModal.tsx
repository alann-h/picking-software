import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

interface AdjustQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentQty: number;
  productId: number;
  onConfirm: (productId: number, newQty: number) => Promise<void>;
}

const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({
  isOpen,
  onClose,
  productName,
  currentQty,
  productId,
  onConfirm
}) => {
  const [newQty, setNewQty] = useState<number>(currentQty || 0);

  useEffect(() => {
    if (isOpen) {
      setNewQty(currentQty || 0);
    }
  }, [isOpen, currentQty]);

  const handleQtyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setNewQty(isNaN(value) ? 0 : value);
  };

  const handleConfirm = async () => {
    await onConfirm(productId, newQty);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Adjust Quantity for {productName}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New Quantity"
          type="number"
          fullWidth
          value={newQty}
          onChange={handleQtyChange}
          inputProps={{ min: 0 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdjustQuantityModal;