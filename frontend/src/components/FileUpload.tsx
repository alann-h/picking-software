import React, { useRef, DragEvent, ChangeEvent } from 'react';
import { Box, Typography, Button, Paper, useTheme } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUpload: () => void;
  selectedFile: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onUpload, selectedFile }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();

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
      onFileSelect(file);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Paper elevation={3} sx={{ padding: 3, backgroundColor: theme.palette.background.paper }}>
        <Helmet>
          <title>Smart Picker | Upload Data</title>
        </Helmet>
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
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 2, color: theme.palette.text.secondary }}>
              Selected file: <strong>{selectedFile.name}</strong> ({selectedFile.type || 'Unknown format'})
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={onUpload}
          disabled={!selectedFile}
          sx={{ mt: 3 }}
          fullWidth
        >
          Upload File
        </Button>
      </Paper>
    </motion.div>
  );
};

export default FileUpload;