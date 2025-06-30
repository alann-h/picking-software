import React, { useState } from 'react';
import { Grid } from '@mui/material';
import { motion } from 'framer-motion';
import FileUpload from '../FileUpload';
import ExcelInfoComponent from '../ExcelInfoComponent';
import { useSnackbarContext } from '../SnackbarContext';
import { uploadProducts } from '../../api/products';

interface UploadTabProps {
  refetch: () => void;
}

const UploadTab: React.FC<UploadTabProps> = ({ refetch }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { handleOpenSnackbar } = useSnackbarContext();

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
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <FileUpload
          onFileSelect={setSelectedFile}
          onUpload={handleUpload}
          selectedFile={selectedFile}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
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
};

export default UploadTab;