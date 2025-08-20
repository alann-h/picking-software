import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  InputAdornment,
  Stack,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon,
  Inventory as InventoryIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Product } from '../../utils/types';
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
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchField, setSearchField] = useState<'all' | 'name' | 'sku'>('all');

  const handleSearchFieldChange = (field: 'all' | 'name' | 'sku') => {
    setSearchField(field);
  };

  const getSearchPlaceholder = () => {
    switch (searchField) {
      case 'name': return 'Search by product name...';
      case 'sku': return 'Search by SKU...';
      default: return 'Search by product name or SKU...';
    }
  };

  const getFilteredProducts = () => {
    if (!searchTerm) return filteredProducts;
    
    return filteredProducts.filter((product) => {
      const searchLower = searchTerm.toLowerCase();
      
      switch (searchField) {
        case 'name':
          return product.productName.toLowerCase().includes(searchLower);
        case 'sku':
          return product.sku && product.sku.toLowerCase().includes(searchLower);
        default:
          return product.productName.toLowerCase().includes(searchLower) ||
                 (product.sku && product.sku.toLowerCase().includes(searchLower));
      }
    });
  };

  const finalFilteredProducts = getFilteredProducts();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box>
        <title>Smart Picker | Current Products</title>
        
        {/* Header Section */}
        <Stack spacing={3} sx={{ mb: 4 }}>
          <Box>
            <Typography 
              variant="h4" 
              component="h2" 
              fontWeight="bold" 
              gutterBottom
              sx={{ color: 'primary.main' }}
            >
              Current Products in System
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your product inventory, search by name or SKU, and update product details
            </Typography>
          </Box>

          {/* Enhanced Search Section */}
          <Card 
            elevation={0}
            sx={{ 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={3}>
                {/* Search Field Selector */}
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2} 
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Typography variant="body2" fontWeight="500" color="text.secondary">
                    Search by:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label="All Fields"
                      onClick={() => handleSearchFieldChange('all')}
                      color={searchField === 'all' ? 'primary' : 'default'}
                      variant={searchField === 'all' ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                    <Chip
                      label="Product Name"
                      onClick={() => handleSearchFieldChange('name')}
                      color={searchField === 'name' ? 'primary' : 'default'}
                      variant={searchField === 'name' ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                    <Chip
                      label="SKU"
                      onClick={() => handleSearchFieldChange('sku')}
                      color={searchField === 'sku' ? 'primary' : 'default'}
                      variant={searchField === 'sku' ? 'filled' : 'outlined'}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </Stack>
                </Stack>

                {/* Search Input */}
                <TextField
                  fullWidth
                  placeholder={getSearchPlaceholder()}
                  value={searchTerm}
                  onChange={onSearchChange}
                  variant="outlined"
                  size="medium"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <Tooltip title="Clear search">
                            <IconButton
                              size="small"
                              onClick={() => onSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
                              sx={{ color: 'text.secondary' }}
                            >
                              <ClearIcon />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 2,
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-root': {
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      },
                    },
                  }}
                />

                {/* Search Results Summary */}
                <Stack 
                  direction="row" 
                  alignItems="center" 
                  spacing={2}
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'white', 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <InventoryIcon color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Showing {finalFilteredProducts.length} of {filteredProducts.length} products
                    </Typography>
                    {searchTerm && (
                      <Typography variant="body2" color="primary.main" fontWeight="500">
                        Search results for "{searchTerm}" in {searchField === 'all' ? 'all fields' : searchField === 'name' ? 'product names' : 'SKUs'}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        {/* Product List */}
        <Box>
          <ProductList 
            products={finalFilteredProducts} 
            isLoading={isLoading} 
            onRefresh={refetch} 
            updateProductDb={updateProductDb} 
            setProductArchiveStatus={setProductArchiveStatus} 
            addProductDb={addProductDb} 
            isAdmin={isAdmin}
          />
        </Box>
      </Box>
    </motion.div>
  );
};

export default ProductsTab;