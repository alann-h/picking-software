import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from '@mui/material';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (qty: number) => void;
  availableQty: number;
  productName: string;
}

const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableQty,
  productName,
}) => {
  // Mode toggle: false = decimal, true = fraction
  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);

  const [decimalInput, setDecimalInput] = useState<string>('1');

  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');

  const [parsedQty, setParsedQty] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      setIsFractionMode(false);
      setDecimalInput('1');
      setNumeratorInput('1');
      setDenominatorInput('1');
      setParsedQty(1);
    }
  }, [isOpen, availableQty, productName]);

  // Parse decimal input whenever it changes
  useEffect(() => {
    if (!isFractionMode) {
      const num = parseFloat(decimalInput);
      setParsedQty(isNaN(num) ? 0 : num);
    }
  }, [decimalInput, isFractionMode]);

  // Parse fraction input whenever numerator/denominator changes
  useEffect(() => {
    if (isFractionMode) {
      const num = parseFloat(numeratorInput);
      const den = parseFloat(denominatorInput);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        setParsedQty(num / den);
      } else {
        setParsedQty(0);
      }
    }
  }, [numeratorInput, denominatorInput, isFractionMode]);

  const handleDecimalChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDecimalInput(e.target.value);
  };

  const handleNumeratorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNumeratorInput(e.target.value);
  };

  const handleDenominatorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDenominatorInput(e.target.value);
  };

  const handleConfirm = () => {
    onConfirm(parsedQty);
    onClose();
  };

  // Validation flags
  const isTooLow = parsedQty <= 0;
  const isTooHigh = parsedQty > availableQty;
  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>{productName}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Enter the quantity of the scanned product:
        </Typography>

        <Button
          size="small"
          onClick={() => setIsFractionMode((prev) => !prev)}
          sx={{ mb: 2 }}
        >
          {isFractionMode ? 'Switch to Decimal' : 'Switch to Fraction'}
        </Button>

        {isFractionMode ? (
          <>
            <TextField
              label="Units"
              type="number"
              value={numeratorInput}
              onChange={handleNumeratorChange}
              slotProps={{ htmlInput: { min: 0 }}}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Units in Box"
              type="number"
              value={denominatorInput}
              onChange={handleDenominatorChange}
              slotProps={{ htmlInput: { min: 1 }}}
              fullWidth
              margin="dense"
              helperText={
                isInvalidFraction ? 'Denominator must be > 0' : ''
              }
              error={isInvalidFraction}
            />
          </>
        ) : (
          <TextField
            label="Quantity"
            type="number"
            value={decimalInput}
            onChange={handleDecimalChange}
            slotProps={{ htmlInput: { min: 0, step: 'any' }}}
            fullWidth
            margin="dense"
            helperText={
              isTooLow
                ? 'Enter a number greater than zero'
                : isTooHigh
                ? `Cannot exceed available quantity (${availableQty})`
                : ''
            }
            error={isTooLow || isTooHigh}
          />
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Available Quantity: {availableQty}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={
            isTooLow ||
            isTooHigh ||
            (isFractionMode && isInvalidFraction)
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeModal;
