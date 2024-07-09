import React from 'react';
import { Button } from '@mui/material';

interface AddProductButtonProps {
  onClick: () => void;
}

const AddProductButton: React.FC<AddProductButtonProps> = ({ onClick }) => {
  return (
    <Button variant="contained" color="primary" onClick={onClick} fullWidth sx={{ mt: 2 }}>
      Add Product
    </Button>
  );
};

export default AddProductButton;