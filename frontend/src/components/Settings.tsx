import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Box, Typography, Button, Paper, useTheme, Grid, Tabs, Tab } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { uploadProducts } from '../api/others';
import { useSnackbarContext } from './SnackbarContext';
import ExcelInfoComponent from './ExcelInfoComponent';

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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
    } else {
      handleOpenSnackbar('Please upload an Excel file (.xlsx or .xls)', 'error');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      handleOpenSnackbar('No file selected', 'error');
      return;
    }

    uploadProducts(selectedFile)
      .then(() => {
        handleOpenSnackbar('File uploaded successfully!', 'success');
        setSelectedFile(null);
      })
      .catch((err: Error) => {
        handleOpenSnackbar('Error uploading file: ' + err.message, 'error');
      });
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ padding: 3, maxWidth: 800, margin: 'auto' }}>
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
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>Current Products in System</Typography>
          {/* Add content for current products here */}
          <Typography>Content for current products will be added here.</Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Paper elevation={3} sx={{ padding: 3, backgroundColor: theme.palette.background.paper }}>
                  <Typography variant="h6" gutterBottom sx={{fontWeight: 'bold'}}>
                    Upload Product Data
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Upload your Excel file (.xlsx or .xls) containing product data:
                  </Typography>

                  <Box
                    sx={{
                      border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.grey[300]}`,
                      borderRadius: 2,
                      padding: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      backgroundColor: isDragging ? theme.palette.primary.light : 'transparent',
                    }}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                    />
                    <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
                    <Typography variant="body1">
                      {selectedFile ? selectedFile.name : 'Drag and drop your file here, or click to select'}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpload}
                    disabled={!selectedFile}
                    sx={{ mt: 3 }}
                    fullWidth
                  >
                    Upload File
                  </Button>
                </Paper>
              </motion.div>
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
      </Paper>
    </Box>
  );
};

export default Settings;