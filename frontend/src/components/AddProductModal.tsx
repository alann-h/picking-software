// AddProductModal.tsx

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
 * Parse a quantity string into a number.
 * Supports decimals ("1.25") or simple fractions ("5/12").
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
};

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit }) => {
  const theme = useTheme();

  const { allProducts, isLoading, refetch } = useAllProducts();

  // The numeric value we'll actually submit
  const [qty, setQty] = useState<number>(1);

  // What the user types (so we can show "5/12" etc)
  const [qtyInput, setQtyInput] = useState<string>('1');

  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (open) {
      refetch();
      setQty(1);
      setQtyInput('1');
      setProduct(null);
    }
  }, [open, refetch]);

  const handleIncrement = () => {
    const next = parseFloat((qty + STEP).toFixed(4));
    setQty(next);
    setQtyInput(next.toString());
  };

  const handleDecrement = () => {
    const next = parseFloat((qty - STEP).toFixed(4));
    if (next > 0) {
      setQty(next);
      setQtyInput(next.toString());
    }
  };

  const onQtyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setQtyInput(raw);
    const parsed = parseQty(raw);
    setQty(parsed > 0 ? parsed : 0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (product && qty > 0) {
      await onSubmit(product.productId, qty);
      onClose();
    }
  };

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

            {/* Quantity input */}
            <TextField
              label="Quantity"
              type="text"
              value={qtyInput}
              onChange={onQtyChange}
              fullWidth
              variant="outlined"
              inputProps={{
                inputMode: 'decimal',
                pattern: '[0-9.\\/]*',
              }}
              sx={{ mb: 3 }}
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
            />

            <Button
              type="submit"
              variant="contained"
              disabled={!product || qty <= 0}
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
