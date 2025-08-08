// src/components/ProductFilter.tsx

import React, { ChangeEvent } from 'react';
import { TextField, Select, MenuItem, FormControl, InputLabel, Box, IconButton, SelectChangeEvent } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { ProductDetail } from '../utils/types';

// Define SortField type here or in your types file
export type SortField = keyof Pick<ProductDetail, 'sku' | 'productName' | 'pickingQty' | 'pickingStatus'>;

interface ProductFilterProps {
  searchTerm: string;
  sortField: SortField | '';
  sortOrder: 'asc' | 'desc';
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSortFieldChange: (event: SelectChangeEvent<SortField | ''>) => void;
  onSortOrderChange: () => void;
}

const ProductFilter: React.FC<ProductFilterProps> = ({
  searchTerm,
  sortField,
  sortOrder,
  onSearchChange,
  onSortFieldChange,
  onSortOrderChange,
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
      <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="sort-field-label">Sort By</InputLabel>
        <Select
          labelId="sort-field-label"
          value={sortField}
          onChange={onSortFieldChange}
          label="Sort By"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value="sku">SKU</MenuItem>
          <MenuItem value="productName">Product Name</MenuItem>
          <MenuItem value="pickingQty">Picking Quantity</MenuItem>
          <MenuItem value="pickingStatus">Picking Status</MenuItem>
        </Select>
      </FormControl>
      <IconButton
        onClick={onSortOrderChange}
        disabled={!sortField}
        size="small"
      >
        {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
      </IconButton>
    </Box>
  );
};

export default ProductFilter;