import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  useTheme, 
  CircularProgress,
  Container,
  useMediaQuery,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
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
import { useAuth } from '../hooks/useAuth';

const Settings: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const { allProducts, isLoading, refetch } = useAllProducts();

  const [searchTerm, setSearchTerm] = useState('');

  const currentPath = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/settings/upload')) return 'upload';
    if (path.includes('/settings/users')) return 'users';
    return 'products';
  }, [location.pathname]);

  const handleMenuClick = (path: string) => {
    navigate(`/settings/${path}`);
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

  const menuItems = [
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
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
              {/* Vertical Menu Sidebar */}
              <Paper 
                elevation={0}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  overflow: 'hidden',
                  width: { xs: '100%', lg: 320 },
                  flexShrink: 0,
                  bgcolor: 'grey.50'
                }}
              >
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    p: 2
                  }}
                >
                  <Typography variant="h6" fontWeight={600} color="text.primary">
                    Navigation
                  </Typography>
                </Box>
                
                <List sx={{ p: 0 }}>
                  {menuItems.map((item, index) => (
                    <React.Fragment key={item.path}>
                      <ListItem disablePadding>
                        <ListItemButton
                          onClick={() => handleMenuClick(item.path)}
                          selected={currentPath === item.path}
                          sx={{
                            py: 2.5,
                            px: 3,
                            '&.Mui-selected': {
                              bgcolor: 'primary.50',
                              borderRight: '3px solid',
                              borderColor: 'primary.main',
                              '&:hover': {
                                bgcolor: 'primary.100',
                              }
                            },
                            '&:hover': {
                              bgcolor: 'grey.100',
                            }
                          }}
                        >
                          <ListItemIcon 
                            sx={{ 
                              color: currentPath === item.path ? 'primary.main' : 'text.secondary',
                              minWidth: 40
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography 
                                variant="body1" 
                                fontWeight={currentPath === item.path ? 600 : 500}
                                color={currentPath === item.path ? 'primary.main' : 'text.primary'}
                              >
                                {item.label}
                              </Typography>
                            }
                            secondary={
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ display: { xs: 'none', lg: 'block' } }}
                              >
                                {item.description}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < menuItems.length - 1 && (
                        <Divider sx={{ mx: 3, opacity: 0.6 }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>

              {/* Content Area */}
              <Paper 
                elevation={0}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  overflow: 'hidden',
                  flex: 1,
                  bgcolor: 'white'
                }}
              >
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
            </Box>
          </motion.div>
        </Stack>
      </Container>
    </Box>
  );
};

export default Settings;
