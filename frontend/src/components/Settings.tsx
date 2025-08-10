import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, useTheme, Tabs, Tab, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';

import { useAllProducts } from './useAllProducts';
import { useUserStatus } from '../utils/useUserStatus';

import ProductsTab from './tabs/ProductsTab';
import UploadTab from './tabs/UploadTab';
import UsersTab from './tabs/UsersTab';

const Settings: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoadingStatus } = useUserStatus(false);

  const { allProducts, isLoading, refetch } = useAllProducts();

  const [searchTerm, setSearchTerm] = useState('');

  const tabValue = useMemo(() => {
    if (isLoadingStatus) {
      return false;
    }
    const path = location.pathname;
    if (isAdmin) {
      if (path.includes('/settings/upload')) return 1;
      if (path.includes('/settings/users')) return 2;
    }
    return 0;
  }, [location.pathname, isAdmin, isLoadingStatus]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
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
    return allProducts.filter((product) =>
      product.productName.toLowerCase().includes(searchTerm)
    );
  }, [allProducts, searchTerm]);

  return (
    <Box sx={{ padding: 3, maxWidth: 1200, margin: 'auto' }}>
      <title>Smart Picker | Settings</title>
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
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs" variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Current Products" />
          {isAdmin && [
            <Tab key="upload-tab" label="Upload Data" />,
            <Tab key="users-tab" label="User Management" />,
          ]}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {isLoadingStatus ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
              <CircularProgress />
            </Box>
          ) : (
            <Routes>
              <Route
                path="products"
                element={
                  <ProductsTab
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    filteredProducts={filteredProducts}
                    isLoading={isLoading}
                    refetch={refetch}
                    isAdmin={isAdmin}
                  />
                }
              />
              <Route 
                path="upload" 
                element={isAdmin ? <UploadTab refetch={refetch} /> : <Navigate to="/settings/products" replace />} 
              />
              <Route 
                path="users" 
                element={isAdmin ? <UsersTab /> : <Navigate to="/settings/products" replace />} 
              />
              <Route path="*" element={<Navigate to="products" replace />} />
            </Routes>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings;
