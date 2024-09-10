import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from '@mui/material';

interface QtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (qty: number) => void;
  availableQty: number;
  productName: string;
}

const QtyModal: React.FC<QtyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableQty,
  productName,
}) => {
  const [inputQty, setInputQty] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setInputQty(1);
    }
  }, [isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQty = Math.min(parseInt(event.target.value) || 0, availableQty);
    setInputQty(newQty);
  };

  const handleConfirm = () => {
    onConfirm(inputQty);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{productName}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Enter the quantity of the scanned product:
        </Typography>
        <TextField
          type="number"
          value={inputQty}
          onChange={handleInputChange}
          inputProps={{
            min: 0,
            max: availableQty,
          }}
          fullWidth
          margin="normal"
        />
        <Typography variant="body2" color="text.secondary">
          Available Quantity: {availableQty}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={inputQty === 0 || inputQty > availableQty}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QtyModal;