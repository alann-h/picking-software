import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, useTheme, Grid, Tabs, Tab } from '@mui/material';
import { motion } from 'framer-motion';
import { uploadProducts } from '../api/others';
import { useSnackbarContext } from './SnackbarContext';
import ExcelInfoComponent from './ExcelInfoComponent';
import { useAllProducts } from './useAllProducts';
import ProductList from './ProductListSettings';
import SearchBar from './SearchBarSettings';
import FileUpload from './FileUpload';
import UserManagement from './UsersManagment';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const theme = useTheme();
  const { allProducts, isLoading, refetch } = useAllProducts();
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab based on the current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/settings/upload')) return 1;
    if (path.includes('/settings/users')) return 2;
    return 0; // Default to products tab
  };
  
  const tabValue = getActiveTab();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    // Navigate to the appropriate route based on tab index
    switch (newValue) {
      case 0:
        navigate('/settings/products');
        break;
      case 1:
        navigate('/settings/upload');
        break;
      case 2:
        navigate('/settings/users');
        break;
      default:
        navigate('/settings/products');
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => 
      product.productName.toLowerCase().includes(searchTerm)
    );
  }, [allProducts, searchTerm]);

  const handleUpload = () => {
    if (!selectedFile) {
      handleOpenSnackbar('No file selected', 'error');
      return;
    }

    uploadProducts(selectedFile)
      .then(() => {
        handleOpenSnackbar('File uploaded successfully!', 'success');
        setSelectedFile(null);
        refetch();
      })
      .catch((err: Error) => {
        handleOpenSnackbar('Error uploading file: ' + err.message, 'error');
      });
  };

  // Components for each tab
  const ProductsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Current Products in System</Typography>
      <Box mb={3}>
        <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
      </Box>
      <ProductList products={filteredProducts} isLoading={isLoading} onRefresh={refetch} />
    </Box>
  );

  const UploadTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FileUpload 
          onFileSelect={setSelectedFile} 
          onUpload={handleUpload} 
          selectedFile={selectedFile} 
        />
      </Grid>
      <Grid item xs={12}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ExcelInfoComponent />
        </motion.div>
      </Grid>
    </Grid>
  );

  const UsersTab = () => (
    <Box sx={{ maxWidth: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h6" gutterBottom color="primary">
          User Management
        </Typography>
        <UserManagement />
      </motion.div>
    </Box>
  );

  return (
    <Box sx={{ padding: 3, maxWidth: 1200, margin: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
          Settings
        </Typography>
      </motion.div>

      <Paper elevation={3} sx={{ backgroundColor: theme.palette.background.paper }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="Current Products" />
          <Tab label="Upload Data" />
          <Tab label="User Management" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <Routes>
            <Route path="products" element={<ProductsTab />} />
            <Route path="upload" element={<UploadTab />} />
            <Route path="users" element={<UsersTab />} />
            <Route path="/" element={<Navigate to="products" replace />} />
          </Routes>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;