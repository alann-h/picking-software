import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import {
  Modal, Box, Typography, TextField, Button, Autocomplete, 
  IconButton, Paper, Fade, InputAdornment, CircularProgress,
  Divider, Chip, Stack, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CalculateIcon from '@mui/icons-material/Calculate';
import FunctionsIcon from '@mui/icons-material/Functions';
import { Product } from '../utils/types';
import { useAllProducts } from './useAllProducts';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (variables: { productId: number; qty: number }) => void;
  isSubmitting: boolean;
}

const STEP = 1;

const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: 16,
  width: '100%',
  maxWidth: 500,
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: theme.shadows[24],
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

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit, isSubmitting }) => {
  const { allProducts, isLoading: isProductListLoading, refetch } = useAllProducts();

  const [isFractionMode, setIsFractionMode] = useState<boolean>(false);
  const [decimalInput, setDecimalInput] = useState<string>('1');
  const [numeratorInput, setNumeratorInput] = useState<string>('1');
  const [denominatorInput, setDenominatorInput] = useState<string>('1');
  const [parsedQty, setParsedQty] = useState<number>(1);
  const [product, setProduct] = useState<Product | null>(null);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (product && parsedQty > 0) {
      onSubmit({ productId: product.productId, qty: parsedQty });
      onClose();
    }
  };

  const isInvalidFraction = isFractionMode && parseFloat(denominatorInput) === 0;
  const isTooLow = parsedQty <= 0;

  return (
    <StyledModal open={open} onClose={onClose}>
      <Fade in={open}>
        <StyledPaper>
          <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2" fontWeight={600} color="primary">
                Add Product
              </Typography>
              <IconButton 
                onClick={onClose} 
                size="small" 
                disabled={isSubmitting}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <form onSubmit={handleSubmit}>
              {/* Product Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={500} gutterBottom>
                  Select Product
                </Typography>
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
                      label="Choose a product" 
                      size="small"
                      placeholder="Search products..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {option.productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          SKU: {option.sku}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Box>
              
              {/* Quantity Input Method */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={500} gutterBottom>
                  Quantity Input Method
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
                    error={parseFloat(numeratorInput) < 0}
                    helperText={parseFloat(numeratorInput) < 0 ? 'Enter a valid numerator' : ''}
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    slotProps={{
                      input: {
                        inputProps: { min: 1, step: 1 }
                      }
                    }}
                  />
                </Stack>
              ) : (
                <Box sx={{ mb: 3 }}>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={decimalInput}
                    onChange={handleDecimalChange}
                    size="small"
                    error={isTooLow}
                    helperText={isTooLow ? 'Quantity must be greater than 0' : ''}
                    disabled={isSubmitting}
                    slotProps={{
                      input: {
                        inputProps: { min: 0, step: 1.00 },
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconButton 
                              onClick={handleDecrement} 
                              size="small" 
                              disabled={isSubmitting}
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
                              disabled={isSubmitting}
                              sx={{ color: 'text.secondary' }}
                            >
                              <AddIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }
                    }}
                  />
                </Box>
              )}

              {/* Calculated Value Display */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Calculated Value:
                </Typography>
                <Typography variant="h6" fontWeight={600} color={isTooLow ? 'error.main' : 'success.main' }>
                  {typeof parsedQty === 'number' && !isNaN(parsedQty) ? parsedQty.toFixed(2) : '0.00'}
                </Typography>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                disabled={isProductListLoading || isSubmitting || !product || parsedQty <= 0 || isInvalidFraction}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                fullWidth
                size="large"
                sx={{ 
                  borderRadius: 2, 
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                {isSubmitting ? 'Adding Product...' : 'Add Product'}
              </Button>
            </form>
          </Box>
        </StyledPaper>
      </Fade>
    </StyledModal>
  );
};

export default AddProductModal;