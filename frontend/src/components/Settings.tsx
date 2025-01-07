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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const { allProducts, isLoading, refetch } = useAllProducts();
  const [searchTerm, setSearchTerm] = useState('');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
          < Tab label="User Managment" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>Current Products in System</Typography>
          <Box mb={3}>
            <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
          </Box>
          <ProductList products={filteredProducts} isLoading={isLoading} onRefresh={refetch} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
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
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
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
        </TabPanel>

      </Paper>
    </Box>
  );
};

export default Settings;