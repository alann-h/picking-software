// src/components/Settings.tsx
import React, { useState, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { uploadProducts } from '../api/others';
import { useSnackbarContext } from './SnackbarContext';

const Settings: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      handleOpenSnackbar('No file selected', 'error');
      return;
    }

    uploadProducts(selectedFile)
      .then( () => {
        handleOpenSnackbar('File uploaded successfully!', 'success');
      })
      .catch((err) => {
        handleOpenSnackbar('Error uploading file: ' + err.message, 'error');
      });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ padding: '20px' }}>
      <Typography variant="h2">Settings</Typography>
      <Typography variant="body1" paragraph>
        Upload your Excel file below:
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <Button variant="contained" color="primary" onClick={handleButtonClick}>
          Choose File
        </Button>
        <Button variant="contained" color="secondary" onClick={handleUpload} disabled={!selectedFile}>
          Upload File
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
