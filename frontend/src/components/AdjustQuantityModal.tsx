import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress, // Import CircularProgress
} from '@mui/material';

// highlight-start
// 1. Update the props interface to receive the loading state
// and a simplified onConfirm function.
interface AdjustQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentQty: number;
  productId: number;
  onConfirm: (variables: { productId: number; newQty: number }) => void;
  isLoading: boolean;
}
// highlight-end

const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({
  isOpen,
  onClose,
  productName,
  currentQty,
  productId,
  onConfirm,
  isLoading,
}) => {
  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);
  const [decimalInput, setDecimalInput] = useState<string>(currentQty.toString());
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');
  const [parsedQty, setParsedQty] = useState<number>(currentQty);

  useEffect(() => {
    if (isOpen) {
      setIsFractionMode(false);
      setDecimalInput(currentQty.toString());
      setNumeratorInput('1');
      setDenominatorInput('1');
      setParsedQty(currentQty);
    }
  }, [isOpen, currentQty]);


  useEffect(() => { if (!isFractionMode) { const num = parseFloat(decimalInput); setParsedQty(isNaN(num) ? 0 : num); } }, [decimalInput, isFractionMode]);
  useEffect(() => { if (isFractionMode) { const num = parseFloat(numeratorInput); const den = parseFloat(denominatorInput); if (!isNaN(num) && !isNaN(den) && den !== 0) { setParsedQty(num / den); } else { setParsedQty(0); } } }, [numeratorInput, denominatorInput, isFractionMode]);
  const handleDecimalChange = (e: ChangeEvent<HTMLInputElement>) => setDecimalInput(e.target.value);
  const handleNumeratorChange = (e: ChangeEvent<HTMLInputElement>) => setNumeratorInput(e.target.value);
  const handleDenominatorChange = (e: ChangeEvent<HTMLInputElement>) => setDenominatorInput(e.target.value);

  const handleConfirm = () => {
    if (parsedQty > 0) {
      onConfirm({ productId, newQty: parsedQty });
      onClose();
    }
  };
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
          disabled={isLoading}
        >
          {isFractionMode ? 'Switch to Decimal' : 'Switch to Fraction'}
        </Button>

        {isFractionMode ? (
          <>
            <TextField label="Units" type="number" value={numeratorInput} onChange={handleNumeratorChange} fullWidth margin="dense" disabled={isLoading} />
            <TextField label="Units in Box" type="number" value={denominatorInput} onChange={handleDenominatorChange} fullWidth margin="dense" disabled={isLoading} helperText={isInvalidFraction ? 'Denominator must be > 0' : ''} error={isInvalidFraction} />
          </>
        ) : (
          <TextField label="Quantity" type="number" value={decimalInput} onChange={handleDecimalChange} fullWidth margin="dense" disabled={isLoading} helperText={isTooLow ? 'Enter a number greater than zero' : ''} error={isTooLow} />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          variant="contained"
          disabled={isTooLow || isInvalidFraction || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Confirming...' : 'Confirm'}
          // highlight-end
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdjustQuantityModal;