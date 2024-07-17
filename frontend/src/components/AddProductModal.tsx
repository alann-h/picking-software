import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Autocomplete } from '@mui/material';
import { Product } from '../utils/types';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (productName: string, qty: number) => void;
  products: Product[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit, products }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product) {
      onSubmit(product.productName, qty);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
      }}>
        <Typography variant="h6">Add Product</Typography>
        <form onSubmit={handleSubmit}>
          <Autocomplete
            id="product-box"
            options={products}
            getOptionLabel={(option) => option.productName}
            value={product}
            onChange={(_, newValue) => setProduct(newValue)}
            renderInput={(params) => <TextField {...params} label="Product" />}
            sx={{ width: '100%', marginBottom: 2 }}
          />
          <TextField
            label="Quantity"
            type="number"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value))}
            fullWidth
            margin="normal"
          />
          <Button type="submit" variant="contained" disabled={!product}>Add Product</Button>
        </form>
      </Box>
    </Modal>
  );
};

export default AddProductModal;