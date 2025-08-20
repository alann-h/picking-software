import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CalculateIcon from '@mui/icons-material/Calculate';
import FunctionsIcon from '@mui/icons-material/Functions';
import QrCodeIcon from '@mui/icons-material/QrCode';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (_qty: number) => void;
  availableQty: number;
  productName: string;
}

const StyledDialog = styled(Dialog)(() => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    minWidth: 400,
    maxWidth: 500,
  },
}));

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
}));

const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableQty,
  productName,
}) => {
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

  useEffect(() => {
    if (!isFractionMode) {
      const num = parseFloat(decimalInput);
      setParsedQty(isNaN(num) ? 0 : num);
    }
  }, [decimalInput, isFractionMode]);

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

  const STEP = 1;
  
  const handleDenominatorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDenominatorInput(e.target.value);
  };
  
  const handleIncrement = () => { 
    if (!isFractionMode) { 
      const next = parseFloat((parsedQty + STEP).toFixed(4)); 
      setParsedQty(next); 
      setDecimalInput(next.toString()); 
    } 
  };
  
  const handleDecrement = () => { 
    if (!isFractionMode) { 
      const next = parseFloat((parsedQty - STEP).toFixed(4)); 
      if (next > 0) { 
        setParsedQty(next); 
        setDecimalInput(next.toString()); 
      } 
    } 
  };

  const handleConfirm = () => {
    onConfirm(parsedQty);
    onClose();
  };

  const isTooLow = parsedQty <= 0;
  const isTooHigh = parsedQty > availableQty;
  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;

  return (
    <StyledDialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeIcon color="primary" />
          <Typography variant="h6" fontWeight={600} color="primary">
            Barcode Scan
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {productName}
        </Typography>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {/* Available Quantity Display */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'info.50', borderRadius: 2, border: '1px solid', borderColor: 'info.200' }}>
          <Typography variant="body2" color="info.main" gutterBottom>
            Available Quantity
          </Typography>
          <Typography variant="h5" fontWeight={600} color="info.main">
            {availableQty}
          </Typography>
        </Box>

        {/* Input Method Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={500} gutterBottom>
            Input Method
          </Typography>
          <ToggleButtonGroup
            value={isFractionMode ? 'fraction' : 'decimal'}
            exclusive
            onChange={(_, value) => setIsFractionMode(value === 'fraction')}
            size="small"
            sx={{ mb: 2 }}
          >
            <StyledToggleButton value="decimal">
              <CalculateIcon sx={{ mr: 1, fontSize: 18 }} />
              Decimal
            </StyledToggleButton>
            <StyledToggleButton value="fraction">
              <FunctionsIcon sx={{ mr: 1, fontSize: 18 }} />
              Fraction
            </StyledToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Quantity Input Fields */}
        {isFractionMode ? (
          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              label="Units"
              type="number"
              value={numeratorInput}
              onChange={handleNumeratorChange}
              size="small"
              slotProps={{
                input: {
                  inputProps: { min: 0, step: 1 }
                }
              }}
            />
            <TextField
              label="Units in Box"
              type="number"
              value={denominatorInput}
              onChange={handleDenominatorChange}
              size="small"
              error={isInvalidFraction}
              helperText={isInvalidFraction ? 'Denominator must be greater than 0' : ''}
              slotProps={{
                input: {
                  inputProps: { min: 1, step: 1 }
                }
              }}
            />
          </Stack>
        ) : (
          <TextField
            label="Quantity"
            type="number"
            value={decimalInput}
            onChange={handleDecimalChange}
            size="small"
            error={isTooLow || isTooHigh}
            helperText={
              isTooLow
                ? 'Quantity must be greater than 0'
                : isTooHigh
                ? `Cannot exceed available quantity (${availableQty})`
                : ''
            }
            slotProps={{
              input: {
                inputProps: { min: 0, step: 1.00 },
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      onClick={handleDecrement} 
                      size="small" 
                      sx={{ color: 'text.secondary' }}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={handleIncrement} 
                      size="small" 
                      sx={{ color: 'text.secondary' }}
                    >
                      <AddIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
            sx={{ mb: 3 }}
          />
        )}

        {/* Calculated Value Display */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.50', 
          borderRadius: 2, 
          border: '1px solid', 
          borderColor: 'grey.200',
          mb: 2
        }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Calculated Value:
          </Typography>
          <Typography 
            variant="h6" 
            fontWeight={600} 
            color={
              isTooLow ? 'error.main' : 
              isTooHigh ? 'warning.main' : 
              'success.main'
            }
          >
            {typeof parsedQty === 'number' && !isNaN(parsedQty) ? parsedQty.toFixed(2) : '0.00'}
          </Typography>
        </Box>

        {/* Validation Messages */}
        {(isTooLow || isTooHigh || isInvalidFraction) && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'error.50', 
            borderRadius: 2, 
            border: '1px solid', 
            borderColor: 'error.200' 
          }}>
            <Typography variant="body2" color="error.main">
              {isTooLow && 'Quantity must be greater than 0'}
              {isTooHigh && `Quantity cannot exceed available amount (${availableQty})`}
              {isInvalidFraction && 'Please enter valid fraction values'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isTooLow || isTooHigh || isInvalidFraction}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Confirm
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default BarcodeModal;
