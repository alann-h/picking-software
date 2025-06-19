import React from 'react';
import { Box, Typography } from '@mui/material';
import { Product } from '../../utils/types';
import SearchBar from '../SearchBarSettings';
import ProductList from '../ProductListSettings';
import { updateProductDb, deleteProductDb, addProductDb } from '../../api/products'; 
import { Helmet } from 'react-helmet-async';

interface ProductsTabProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filteredProducts: Product[];
  isLoading: boolean;
  refetch: () => void;
}

const ProductsTab: React.FC<ProductsTabProps> = ({
  searchTerm,
  onSearchChange,
  filteredProducts,
  isLoading,
  refetch,
}) => (
  <Box>
    <Helmet>
      <title>Smart Picker | Current Products</title>
    </Helmet>
    <Typography variant="h6" gutterBottom>
      Current Products in System
    </Typography>
    <Box mb={3}>
      <SearchBar searchTerm={searchTerm} onSearchChange={onSearchChange} />
    </Box>
    <ProductList products={filteredProducts} isLoading={isLoading} onRefresh={refetch} updateProductDb={updateProductDb} deleteProductDb={deleteProductDb} addProductDb={addProductDb}/>
  </Box>
);

export default ProductsTab;