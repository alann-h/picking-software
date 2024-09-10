import React, { useState, ChangeEvent } from 'react';
import { TextField, Select, MenuItem, FormControl, InputLabel, Box, IconButton, SelectChangeEvent } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { ProductDetail } from '../utils/types';

interface ProductFilterProps {
  products: ProductDetail[];
  onFilterChange: (filteredProducts: ProductDetail[]) => void;
}

type SortField = keyof Pick<ProductDetail, 'sku' | 'productName' | 'pickingQty' | 'pickingStatus'>;

const ProductFilter: React.FC<ProductFilterProps> = ({ products, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField | ''>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    filterAndSortProducts(event.target.value, sortField, sortOrder);
  };

  const handleSortFieldChange = (event: SelectChangeEvent<SortField | ''>) => {
    const newSortField = event.target.value as SortField | '';
    setSortField(newSortField);
    filterAndSortProducts(searchTerm, newSortField, sortOrder);
  };

  const handleSortOrderChange = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    filterAndSortProducts(searchTerm, sortField, newOrder);
  };

  const filterAndSortProducts = (search: string, field: SortField | '', order: 'asc' | 'desc') => {
    const filteredProducts = products.filter((product) =>
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.productName.toLowerCase().includes(search.toLowerCase()) ||
      product.pickingStatus.toLowerCase().includes(search.toLowerCase())
    );

    if (field) {
      filteredProducts.sort((a, b) => {
        if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    onFilterChange(filteredProducts);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
      <TextField
        label="Search"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={handleSearch}
      />
      <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="sort-field-label">Sort By</InputLabel>
        <Select
          labelId="sort-field-label"
          value={sortField}
          onChange={handleSortFieldChange}
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
        onClick={handleSortOrderChange}
        disabled={!sortField}
        size="small"
      >
        {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
      </IconButton>
    </Box>
  );
};

export default ProductFilter;