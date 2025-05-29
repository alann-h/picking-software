// AdjustQuantityModal.tsx

import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface AdjustQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentQty: number;
  productId: number;
  onConfirm: (productId: number, newQty: number) => Promise<void>;
}

function parseQty(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed.includes('/')) {
    const [numStr, denStr] = trimmed.split('/');
    if (numStr && denStr) {
      const num = parseFloat(numStr);
      const den = parseFloat(denStr);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
  }
  const f = parseFloat(trimmed);
  return isNaN(f) ? 0 : f;
};

const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({
  isOpen,
  onClose,
  productName,
  currentQty,
  productId,
  onConfirm
}) => {
  // The string the user types ("5/12", "1.5", etc.)
  const [newQtyInput, setNewQtyInput] = useState<string>(currentQty.toString());
  // The parsed number we actually submit
  const [newQty, setNewQty] = useState<number>(currentQty);

  // Reset whenever the dialog opens or currentQty changes
  useEffect(() => {
    if (isOpen) {
      const initial = currentQty.toString();
      setNewQtyInput(initial);
      setNewQty(currentQty);
    }
  }, [isOpen, currentQty]);

  const handleQtyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setNewQtyInput(raw);
    const parsed = parseQty(raw);
    setNewQty(parsed);
  };

  const handleConfirm = async () => {
    // only proceed if newQty > 0 (or whatever your business rule is)
    if (newQty > 0) {
      await onConfirm(productId, newQty);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Adjust Quantity for {productName}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New Quantity"
          // text so user can type "/"
          type="text"
          fullWidth
          value={newQtyInput}
          onChange={handleQtyChange}
          inputProps={{
            inputMode: 'decimal',
            pattern: '[0-9.\\/]*',
            // optional: enforce a minimum if you like
            // min: '0'
          }}
          helperText={
            newQtyInput.includes('/') && newQty <= 0
              ? 'Enter a valid fraction (e.g. 3/4)'
              : newQty <= 0
              ? 'Enter a number greater than zero'
              : ''
          }
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          disabled={newQty <= 0}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdjustQuantityModal;
