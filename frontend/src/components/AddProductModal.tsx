import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Autocomplete,
  IconButton,
  Paper,
  Fade,
  useTheme,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Product, ProductDetail } from '../utils/types';
import { useAllProducts } from './useAllProducts';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (productId: number, qty: number) => Promise<ProductDetail | undefined>;
}

const STEP = 1;

/**
 * Parse a raw string into a number.
 * Supports fractions ("5/12") or decimals ("1.25").
 */
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
}

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit }) => {
  const theme = useTheme();
  const { allProducts, isLoading, refetch } = useAllProducts();

  // Mode toggle: false = decimal entry, true = fraction entry
  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);

  // Decimal input as a string (e.g. "1.5")
  const [decimalInput, setDecimalInput] = useState<string>('1');

  // Fraction inputs as strings ("numerator" and "denominator")
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');

  // Parsed numeric value, derived from either decimalInput or fraction inputs
  const [parsedQty, setParsedQty] = useState<number>(1);

  // Selected product
  const [product, setProduct] = useState<Product | null>(null);

  // Whenever the modal opens, reset fields
  useEffect(() => {
    if (open) {
      refetch();
      setProduct(null);
      setIsFractionMode(false);
      setDecimalInput('1');
      setNumeratorInput('1');
      setDenominatorInput('1');
      setParsedQty(1);
    }
  }, [open, refetch]);

  // Parse decimal input whenever it changes (only in decimal mode)
  useEffect(() => {
    if (!isFractionMode) {
      const num = parseFloat(decimalInput);
      setParsedQty(isNaN(num) ? 0 : num);
    }
  }, [decimalInput, isFractionMode]);

  // Parse fraction inputs whenever they change (only in fraction mode)
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (product && parsedQty > 0) {
      await onSubmit(product.productId, parsedQty);
      onClose();
    }
  };

  // Validation flags
  const isTooLow = parsedQty <= 0;
  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Paper
          elevation={24}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            p: 4,
            borderRadius: 2,
            outline: 'none',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2" fontWeight="bold" color="primary">
              Add Product
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <form onSubmit={handleSubmit}>
            {/* Product selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Autocomplete<Product, false, false, false>
                options={allProducts}
                getOptionLabel={(option) => option.productName}
                isOptionEqualToValue={(option, value) => option.productId === value.productId}
                value={product}
                onChange={(_, newValue) => setProduct(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Product"
                    variant="outlined"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoading && <CircularProgress size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{ flex: 1, mr: 1 }}
              />
            </Box>

            {/* Mode toggle */}
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
                  error={parseFloat(numeratorInput) < 0}
                  helperText={parseFloat(numeratorInput) < 0 ? 'Enter a valid numerator' : ''}
                />
                <TextField
                  label="Units in Box"
                  type="number"
                  value={denominatorInput}
                  onChange={handleDenominatorChange}
                  inputProps={{ min: 1 }}
                  fullWidth
                  margin="dense"
                  error={isInvalidFraction}
                  helperText={isInvalidFraction ? 'Denominator must be > 0' : ''}
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconButton onClick={handleDecrement} size="small">
                        <RemoveIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleIncrement} size="small">
                        <AddIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText={isTooLow ? 'Enter a number greater than zero' : ''}
                error={isTooLow}
                sx={{ mb: 3 }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={!product || parsedQty <= 0 || (isFractionMode && isInvalidFraction)}
              fullWidth
              size="large"
              sx={{
                borderRadius: 2,
                py: 1.5,
                backgroundColor: theme.palette.primary.main,
                '&:hover': { backgroundColor: theme.palette.primary.dark },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AddIcon sx={{ mr: 1 }} />
                Add Product
              </Box>
            </Button>
          </form>
        </Paper>
      </Fade>
    </Modal>
  );
};

export default AddProductModal;
