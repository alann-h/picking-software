import React from 'react';
import { Box, Typography } from '@mui/material';
import { Product } from '../../utils/types';
import SearchBar from '../SearchBarSettings';
import ProductList from '../ProductListSettings';
import { updateProductDb, setProductArchiveStatus, addProductDb } from '../../api/products'; 

interface ProductsTabProps {
  searchTerm: string;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  filteredProducts: Product[];
  isLoading: boolean;
  refetch: () => void;
  isAdmin: boolean;
}

const ProductsTab: React.FC<ProductsTabProps> = ({
  searchTerm,
  onSearchChange,
  filteredProducts,
  isLoading,
  refetch,
  isAdmin
}) => (
  <Box>
    <title>Smart Picker | Current Products</title>
    <Typography variant="h6" gutterBottom>
      Current Products in System
    </Typography>
    <Box mb={3}>
      <SearchBar searchTerm={searchTerm} onSearchChange={onSearchChange} />
    </Box>
    <ProductList products={filteredProducts} isLoading={isLoading} onRefresh={refetch} updateProductDb={updateProductDb} 
    setProductArchiveStatus={setProductArchiveStatus} addProductDb={addProductDb} isAdmin={isAdmin}/>
  </Box>
);

export default ProductsTab;