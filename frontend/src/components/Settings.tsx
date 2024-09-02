import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Box, Typography, Button, Paper, useTheme, Grid } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { uploadProducts } from '../api/others';
import { useSnackbarContext } from './SnackbarContext';

const Settings: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
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
            <Paper elevation={3} sx={{ padding: 3, backgroundColor: theme.palette.background.paper }}>
              <Typography variant="h6" gutterBottom sx={{fontWeight: 'bold'}}>
                Excel File Structure
              </Typography>
              <Typography variant="body1" paragraph>
                Your Excel file should have the following structure:
              </Typography>
              <Box component="img" src="/excel-example.png" alt="Excel structure example" sx={{ width: '100%', height: 'auto', mb: 2 }} />
              <Typography variant="body2" paragraph>
                - The <strong>Product Name</strong> column should be on the left and match exactly with the names in <strong>QuickBooks</strong>.
              </Typography>
              <Typography variant="body2" paragraph>
                - The <strong>Barcode</strong> column should be on the right, containing unique barcodes for each product.
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                Exporting from QuickBooks
              </Typography>
              <Typography variant="body1" paragraph>
                To export your product list from QuickBooks:
              </Typography>
              <ol>
                <Typography component="li" variant="body2">Go to <strong>Reports</strong> &gt; <strong>List Reports</strong> &gt; <strong>Item Listing</strong></Typography>
                <Typography component="li" variant="body2">Customize the report to include the <strong>Name</strong> field</Typography>
                <Typography component="li" variant="body2">Export the report as an <strong>Excel file</strong></Typography>
                <Typography component="li" variant="body2">Add a <strong>Barcode</strong> column to the exported file and fill in the unique barcodes</Typography>
              </ol>
              <Typography variant="body2" color="text.secondary" >
                Note: Ensure that the product names in your Excel file match exactly with those in QuickBooks to avoid any discrepancies.
              </Typography>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;