import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button } from '@mui/material';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (productName: string, qty: number) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose, onSubmit }) => {
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(productName, qty);
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
          <TextField
            label="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Quantity"
            type="number"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value))}
            fullWidth
            margin="normal"
          />
          <Button type="submit" variant="contained">Add Product</Button>
        </form>
      </Box>
    </Modal>
  );
};

export default AddProductModal;