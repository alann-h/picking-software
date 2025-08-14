import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  useTheme, 
  Tabs, 
  Tab, 
  CircularProgress,
  Container,
  useMediaQuery,
  Stack,
  Divider
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  Inventory as InventoryIcon,
  UploadFile as UploadFileIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';

import { useAllProducts } from './useAllProducts';

import ProductsTab from './tabs/ProductsTab';
import UploadTab from './tabs/UploadTab';
import UsersTab from './tabs/UsersTab';
import { useAuth } from './hooks/useAuth';

const Settings: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const { allProducts, isLoading, refetch } = useAllProducts();

  const [searchTerm, setSearchTerm] = useState('');

  const tabValue = useMemo(() => {
    const path = location.pathname;
    if (isAdmin) {
      if (path.includes('/settings/upload')) return 1;
      if (path.includes('/settings/users')) return 2;
    }
    return 0;
  }, [location.pathname, isAdmin]);

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
      product.productName.toLowerCase().includes(searchTerm) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm))
    );
  }, [allProducts, searchTerm]);

  const tabConfig = [
    {
      label: 'Current Products',
      icon: <InventoryIcon />,
      path: 'products',
      description: 'Manage your product inventory and details'
    },
    ...(isAdmin ? [
      {
        label: 'Upload Data',
        icon: <UploadFileIcon />,
        path: 'upload',
        description: 'Bulk upload products and data files'
      },
      {
        label: 'User Management',
        icon: <GroupIcon />,
        path: 'users',
        description: 'Manage user accounts and permissions'
      }
    ] : [])
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default', 
      py: { xs: 2, sm: 4 },
      px: { xs: 1, sm: 2 }
    }}>
      <title>Smart Picker | Settings</title>
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
        <Stack spacing={{ xs: 3, sm: 4 }}>
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography 
                    variant="h3" 
                    component="h1" 
                    fontWeight="bold"
                    sx={{
                      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Settings
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Configure your Smart Picker system
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </motion.div>
          
          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Paper 
              elevation={0}
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              {/* Enhanced Tabs */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  aria-label="settings tabs" 
                  variant={isMobile ? "scrollable" : "fullWidth"}
                  scrollButtons="auto" 
                  allowScrollButtonsMobile
                  sx={{
                    '& .MuiTab-root': {
                      minHeight: 64,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        fontWeight: 600
                      }
                    },
                    '& .MuiTabs-indicator': {
                      height: 3,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}
                >
                  {tabConfig.map((tab, index) => (
                    <Tab 
                      key={tab.path}
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {tab.icon}
                          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="body1" fontWeight="inherit">
                              {tab.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                              {tab.description}
                            </Typography>
                          </Box>
                        </Stack>
                      }
                      sx={{
                        minWidth: { xs: 'auto', sm: 200 },
                        px: { xs: 2, sm: 3 }
                      }}
                    />
                  ))}
                </Tabs>
              </Box>

              {/* Tab Content */}
              <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
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
              </Box>
            </Paper>
          </motion.div>
        </Stack>
      </Container>
    </Box>
  );
};

export default Settings;
