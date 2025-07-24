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

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit }) => {
  const { allProducts, isLoading: isProductListLoading, refetch } = useAllProducts();

  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);

  const [decimalInput, setDecimalInput] = useState<string>('1');

  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');

  const [parsedQty, setParsedQty] = useState<number>(1);

  const [product, setProduct] = useState<Product | null>(null);

   const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
      setIsSubmitting(false);
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
      setIsSubmitting(true);
      try {
        await onSubmit(product.productId, parsedQty);
        onClose();
      } catch (error) {
        console.error("Failed to add product:", error);
      } finally {
        setIsSubmitting(false);
      }
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
            <IconButton onClick={onClose} size="small" disabled={isSubmitting}>
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
                disabled={isSubmitting}
                loading={isProductListLoading}
                onChange={(_, newValue) => setProduct(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Product"
                    variant="outlined"
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isProductListLoading && <CircularProgress size={20} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }
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
              disabled={isSubmitting}
            >
              {isFractionMode ? 'Switch to Decimal' : 'Switch to Fraction'}
            </Button>

            {isFractionMode ? (
              <>
                <TextField label="Units" type="number" value={numeratorInput} onChange={handleNumeratorChange} inputProps={{ min: 0 }} fullWidth margin="dense" error={parseFloat(numeratorInput) < 0} helperText={parseFloat(numeratorInput) < 0 ? 'Enter a valid numerator' : ''} disabled={isSubmitting} />
                <TextField label="Units in Box" type="number" value={denominatorInput} onChange={handleDenominatorChange} inputProps={{ min: 1 }} fullWidth margin="dense" error={isInvalidFraction} helperText={isInvalidFraction ? 'Denominator must be > 0' : ''} disabled={isSubmitting} />
              </>
            ) : (
              <TextField
                label="Quantity"
                type="number"
                value={decimalInput}
                onChange={handleDecimalChange}
                fullWidth
                margin="dense"
                helperText={isTooLow ? 'Enter a number greater than zero' : ''}
                error={isTooLow}
                disabled={isSubmitting}
                sx={{ mb: 3 }}
                slotProps={{
                  htmlInput: { min: 0, step: 'any' },
                  input : {
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconButton onClick={handleDecrement} size="small" disabled={isSubmitting}><RemoveIcon /></IconButton>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleIncrement} size="small" disabled={isSubmitting}><AddIcon /></IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              // UPDATED: disabled logic now includes isSubmitting
              disabled={isProductListLoading || isSubmitting || !product || parsedQty <= 0 || (isFractionMode && isInvalidFraction)}
              // UPDATED: startIcon now uses isSubmitting
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              fullWidth
              size="large"
              sx={{ mt: 2, borderRadius: 2, py: 1.5 }}
            >
              {isSubmitting ? 'Adding...' : 'Add Product'}
            </Button>
          </form>
        </Paper>
      </Fade>
    </Modal>
  );
};

export default AddProductModal;
