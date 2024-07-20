import React, { useState } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

interface AdjustQuantityButtonProps {
  productName: string;
  currentQty: number;
  adjustProductQtyButton: (productName: string, newQty: number) => Promise<void>;
}

const AdjustQuantityButton: React.FC<AdjustQuantityButtonProps> = ({
  productName,
  currentQty,
  adjustProductQtyButton
}) => {
  const [open, setOpen] = useState(false);
  const [newQty, setNewQty] = useState(currentQty);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleQtyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewQty(Number(event.target.value));
  };

  const handleConfirm = async () => {
    try {
      await adjustProductQtyButton(productName, newQty);
      handleClose();
    } catch (error) {
      // Error handling is done in the useQuote hook
      console.error("Error adjusting quantity:", error);
    }
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Adjust Quantity
      </Button>
      <Dialog open={open} onClose={handleClose}>
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
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdjustQuantityButton;