import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Box,
  Divider,
  Chip,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CalculateIcon from '@mui/icons-material/Calculate';
import FunctionsIcon from '@mui/icons-material/Functions';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface AdjustQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentQty: number;
  productId: number;
  onConfirm: (variables: { productId: number; newQty: number }) => void;
  isLoading: boolean;
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

  const STEP = 1;
  
  const handleDecimalChange = (e: ChangeEvent<HTMLInputElement>) => setDecimalInput(e.target.value);
  const handleNumeratorChange = (e: ChangeEvent<HTMLInputElement>) => setNumeratorInput(e.target.value);
  const handleDenominatorChange = (e: ChangeEvent<HTMLInputElement>) => setDenominatorInput(e.target.value);
  
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
    if (parsedQty > 0) {
      onConfirm({ productId, newQty: parsedQty });
      onClose();
    }
  };

  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;
  const isTooLow = parsedQty <= 0;

  return (
    <StyledDialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 600 }} color="primary.main">
        Adjust Quantity
        <Typography 
          variant="body2" 
          component="p" // Renders a <p> tag, which is valid here
          color="text.secondary" 
          sx={{ mt: 0.5, fontWeight: 'normal' }} // Reset font weight
        >
          {productName}
        </Typography>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{ mb: 3 }}>
        <Typography component="div" variant="body2" color="text.secondary" gutterBottom>
          Current Quantity: <Chip label={currentQty} size="small" color="primary" variant="outlined" />
        </Typography>
        </Box>

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

        {isFractionMode ? (
          <Stack spacing={2}>
            <TextField
              label="Units"
              type="number"
              value={numeratorInput}
              onChange={handleNumeratorChange}
              fullWidth
              size="small"
              disabled={isLoading}
              slotProps={{
                htmlInput: { min: 0, step: 1 }
              }}
            />
            <TextField
              label="Units in Box"
              type="number"
              value={denominatorInput}
              onChange={handleDenominatorChange}
              fullWidth
              size="small"
              disabled={isLoading}
              error={isInvalidFraction}
              helperText={isInvalidFraction ? 'Denominator must be greater than 0' : ''}
              slotProps={{
                htmlInput: { min: 1, step: 1 }
              }}
            />
          </Stack>
        ) : (
          <TextField
            label="New Quantity"
            type="number"
            value={decimalInput}
            onChange={handleDecimalChange}
            fullWidth
            size="small"
            disabled={isLoading}
            error={isTooLow}
            helperText={isTooLow ? 'Quantity must be greater than 0' : ''}
            slotProps={{
              input: {
                inputProps: { min: 0, step: 1.00 },
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton 
                      onClick={handleDecrement} 
                      size="small" 
                      disabled={isLoading}
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
                      disabled={isLoading}
                      sx={{ color: 'text.secondary' }}
                    >
                      <AddIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
          />
        )}

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Calculated Value:
          </Typography>
          <Typography variant="h6" fontWeight={600} color={isTooLow ? 'error.main' : 'success.main'}>
            {typeof parsedQty === 'number' && !isNaN(parsedQty) ? parsedQty.toFixed(2) : '0.00'}
          </Typography>
        </Box>
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          disabled={isLoading}
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isTooLow || isInvalidFraction || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ borderRadius: 2, px: 3 }}
        >
          {isLoading ? 'Confirming...' : 'Confirm'}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default AdjustQuantityModal;