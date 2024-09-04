import React, { useState, useEffect } from 'react';
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
import { Product } from '../utils/types';
import { useAllProducts } from './useAllProducts';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (productName: string, qty: number) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const { allProducts, isLoading, refetch } = useAllProducts();
  const theme = useTheme();

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      onSubmit(product.productName, qty);
      setProduct(null);
      setQty(1);
    }
  };

  const handleIncrement = () => setQty(prev => prev + 1);
  const handleDecrement = () => setQty(prev => Math.max(1, prev - 1));

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
    >
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Autocomplete
                id="product-box"
                options={allProducts}
                getOptionLabel={(option) => option.productName}
                isOptionEqualToValue={(option, value) => option.productName === value.productName}
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
                          {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                sx={{ flex: 1, mr: 1 }}
              />
            </Box>

            <TextField
              label="Quantity"
              type="number"
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              fullWidth
              variant="outlined"
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
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!product}
              fullWidth
              size="large"
              sx={{
                borderRadius: 2,
                py: 1.5,
                backgroundColor: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
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