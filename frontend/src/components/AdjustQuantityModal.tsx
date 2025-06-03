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
  onConfirm,
}) => {
  // Mode toggle: false = decimal entry, true = fraction entry
  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);

  // Decimal input as string (e.g. "1.5")
  const [decimalInput, setDecimalInput] = useState<string>(currentQty.toString());

  // Fraction inputs as strings ("numerator" and "denominator")
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');

  // Parsed numeric value, derived from either decimalInput or fraction inputs
  const [parsedQty, setParsedQty] = useState<number>(currentQty);

  // When the modal opens or currentQty changes, reset everything
  useEffect(() => {
    if (isOpen) {
      setIsFractionMode(false);
      setDecimalInput(currentQty.toString());
      setNumeratorInput('1');
      setDenominatorInput('1');
      setParsedQty(currentQty);
    }
  }, [isOpen, currentQty]);

  // Parse the decimal input whenever it changes (and we're in decimal mode)
  useEffect(() => {
    if (!isFractionMode) {
      const num = parseFloat(decimalInput);
      setParsedQty(isNaN(num) ? 0 : num);
    }
  }, [decimalInput, isFractionMode]);

  // Parse fraction inputs whenever they change (and we're in fraction mode)
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

  const handleConfirm = async () => {
    if (parsedQty > 0) {
      await onConfirm(productId, parsedQty);
      onClose();
    }
  };

  // Validation flags
  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;
  const isTooLow = parsedQty <= 0;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Adjust Quantity for {productName}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Enter the new quantity:
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
              inputProps={{ min: 0 }}
              fullWidth
              margin="dense"
            />
            <TextField
              label="Units in Box"
              type="number"
              value={denominatorInput}
              onChange={handleDenominatorChange}
              inputProps={{ min: 1 }}
              fullWidth
              margin="dense"
              helperText={isInvalidFraction ? 'Denominator must be > 0' : ''}
              error={isInvalidFraction}
            />
          </>
        ) : (
          <TextField
            label="Quantity"
            type="number"
            value={decimalInput}
            onChange={handleDecimalChange}
            inputProps={{
              min: 0,
              step: 'any',
            }}
            fullWidth
            margin="dense"
            helperText={
              isTooLow
                ? 'Enter a number greater than zero'
                : ''
            }
            error={isTooLow}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          variant="contained"
          disabled={
            isTooLow || (isFractionMode && isInvalidFraction)
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdjustQuantityModal;
