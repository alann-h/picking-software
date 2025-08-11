import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
  Modal, Box, Typography, TextField, Button, Autocomplete, 
  IconButton, Paper, Fade, InputAdornment, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Product } from '../utils/types';
import { useAllProducts } from './useAllProducts'; // This custom hook is still useful here

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (variables: { productId: number; qty: number }) => void;
  isSubmitting: boolean;
}

const STEP = 1;

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit, isSubmitting }) => {
  const { allProducts, isLoading: isProductListLoading, refetch } = useAllProducts();

  // All the state for managing the form inputs remains the same
  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);
  const [decimalInput, setDecimalInput] = useState<string>('1');
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');
  const [parsedQty, setParsedQty] = useState<number>(1);
  const [product, setProduct] = useState<Product | null>(null);

  // Reset fields when the modal opens
  useEffect(() => {
    if (open) {
      refetch();
      setProduct(null);
      setIsFractionMode(false);
      setDecimalInput('1');
      setNumeratorInput('1');
      setDenominatorInput('1');
    }
  }, [open, refetch]);
  
  // Input parsing logic remains the same...
  useEffect(() => { if (!isFractionMode) { const num = parseFloat(decimalInput); setParsedQty(isNaN(num) ? 0 : num); } }, [decimalInput, isFractionMode]);
  useEffect(() => { if (isFractionMode) { const num = parseFloat(numeratorInput); const den = parseFloat(denominatorInput); if (!isNaN(num) && !isNaN(den) && den !== 0) { setParsedQty(num / den); } else { setParsedQty(0); } } }, [numeratorInput, denominatorInput, isFractionMode]);
  const handleDecimalChange = (e: ChangeEvent<HTMLInputElement>) => setDecimalInput(e.target.value);
  const handleNumeratorChange = (e: ChangeEvent<HTMLInputElement>) => setNumeratorInput(e.target.value);
  const handleDenominatorChange = (e: ChangeEvent<HTMLInputElement>) => setDenominatorInput(e.target.value);
  const handleIncrement = () => { if (!isFractionMode) { const next = parseFloat((parsedQty + STEP).toFixed(4)); setParsedQty(next); setDecimalInput(next.toString()); } };
  const handleDecrement = () => { if (!isFractionMode) { const next = parseFloat((parsedQty - STEP).toFixed(4)); if (next > 0) { setParsedQty(next); setDecimalInput(next.toString()); } } };


  // highlight-start
  // The handleSubmit function is now much simpler. It doesn't need to be async
  // or handle its own loading/error state.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (product && parsedQty > 0) {
      onSubmit({ productId: product.productId, qty: parsedQty });
      onClose();
    }
  };
  // highlight-end

  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;
  const isTooLow = parsedQty <= 0;

  return (
    <Modal open={open} onClose={onClose}>
      <Fade in={open}>
        <Paper elevation={24} sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2" fontWeight="bold">Add Product</Typography>
            <IconButton onClick={onClose} size="small" disabled={isSubmitting}><CloseIcon /></IconButton>
          </Box>
          <form onSubmit={handleSubmit}>
            <Autocomplete<Product, false, false, false>
              options={allProducts}
              getOptionLabel={(option) => option.productName}
              isOptionEqualToValue={(option, value) => option.productId === value.productId}
              value={product}
              disabled={isSubmitting}
              loading={isProductListLoading}
              onChange={(_, newValue) => setProduct(newValue)}
              renderInput={(params) => <TextField {...params} label="Select Product" />}
              sx={{ mb: 3 }}
            />
            
            <Button size="small" onClick={() => setIsFractionMode((p) => !p)} sx={{ mb: 2 }} disabled={isSubmitting}>{isFractionMode ? 'Use Decimal' : 'Use Fraction'}</Button>
            {isFractionMode ? (
              <>
                <TextField label="Units" type="number" value={numeratorInput} onChange={handleNumeratorChange} slotProps={{htmlInput: {min: 0}}} fullWidth margin="dense" error={parseFloat(numeratorInput) < 0} helperText={parseFloat(numeratorInput) < 0 ? 'Enter a valid numerator' : ''} disabled={isSubmitting} />
                <TextField label="Units in Box" type="number" value={denominatorInput} onChange={handleDenominatorChange} slotProps={{htmlInput: {min: 1}}} fullWidth margin="dense" error={isInvalidFraction} helperText={isInvalidFraction ? 'Denominator must be > 0' : ''} disabled={isSubmitting} />
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
              disabled={isProductListLoading || isSubmitting || !product || parsedQty <= 0 || isInvalidFraction}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
              fullWidth
              size="large"
              sx={{ mt: 2 }}
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