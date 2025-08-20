// src/components/ProductFilter.tsx

import React, { ChangeEvent } from 'react';
import { TextField, Box } from '@mui/material';

interface ProductFilterProps {
  searchTerm: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const ProductFilter: React.FC<ProductFilterProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
      <TextField
        label="Search"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={onSearchChange}
      />
    </Box>
  );
};

export default ProductFilter;