import React, { useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  Stack,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import FileUpload from '../FileUpload';
import { useSnackbarContext } from '../SnackbarContext';
import { uploadProducts } from '../../api/products';

interface UploadTabProps {
  refetch: () => void;
}

const UploadTab: React.FC<UploadTabProps> = ({ refetch }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { handleOpenSnackbar } = useSnackbarContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleUpload = async () => {
    if (!selectedFile) {
      throw new Error('No file selected');
    }
    try {
      const response = await uploadProducts(selectedFile);
      return response;
    } catch (err) {
      handleOpenSnackbar('Error starting upload: ' + err, 'error');
    }
  };

  const handleSuccess = () => {
    handleOpenSnackbar('File processed successfully!', 'success');
    setSelectedFile(null);
    refetch();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Stack spacing={4}>
        {/* Header Section */}
        <Box>
          <Typography
            variant="h4"
            component="h2"
            fontWeight="bold"
            gutterBottom
            sx={{ color: 'primary.main' }}
          >
            Upload Product Data
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bulk upload your product inventory using CSV files. The format guide is included below for your reference.
          </Typography>
        </Box>

        {/* File Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                color: 'white',
                p: { xs: 2, sm: 3 }
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <CloudUploadIcon sx={{ fontSize: 28 }} />
                <Typography variant="h5" fontWeight="bold">
                  File Upload & Format Guide
                </Typography>
              </Stack>
            </Box>
            <CardContent sx={{ p: 0 }}>
              <FileUpload
                onFileSelect={setSelectedFile}
                onUpload={handleUpload}
                selectedFile={selectedFile}
                onSuccess={handleSuccess}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight="bold" color="warning.dark">
                  💡 Upload Tips
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" color="warning.dark">
                    • Ensure your CSV file has the correct column headers
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    • Product names and SKUs are required fields
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    • Large files may take several minutes to process
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    • Processing status will be shown in the interface
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>
      </Stack>
    </motion.div>
  );
};

export default UploadTab;