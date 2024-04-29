import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

interface QtyModalProps {
  isModalOpen: boolean;
  inputQty: number;
  onModalClose: () => void;
  onQtyChange: (qty: number) => void;
  availableQty: number;
  onModalConfirm: () => void;
  productName: string;
}

const QtyModal: React.FC<QtyModalProps> = ({ isModalOpen, inputQty, onModalClose, onQtyChange, availableQty, onModalConfirm, productName }) => {
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQty = parseInt(e.target.value) || 1;
    if (newQty <= availableQty) {
      onQtyChange(newQty);
    }
  };
  return (
    <Dialog open={isModalOpen} onClose={onModalClose}>
      <DialogTitle>{productName}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="quantity"
          label="Quantity"
          type="number"
          fullWidth
          variant="standard"
          value={inputQty}
          onChange={handleQtyChange}
          inputProps={{ min: 1, max: availableQty }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onModalClose}>Cancel</Button>
        <Button onClick={onModalConfirm}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QtyModal;
