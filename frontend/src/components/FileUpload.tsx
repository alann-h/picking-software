import React, { useRef, DragEvent, ChangeEvent, useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  useTheme, 
  LinearProgress,
  Grid,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Divider
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  CheckCircleOutline as CheckCircleOutlineIcon, 
  ErrorOutline as ErrorOutlineIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  FileUploadOutlined as FileUploadOutlinedIcon,
  LabelOutlined as LabelOutlinedIcon,
  QrCode2Outlined as QrCode2OutlinedIcon,
  PinOutlined as PinOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { getJobProgress } from '../api/products';

interface FileUploadProps {
  onFileSelect: (_file: File | null) => void;
  // CHANGED: jobId is a string
  onUpload: () => Promise<{ jobId: string }>;
  selectedFile: File | null;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onUpload, selectedFile, onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  // CHANGED: jobId state is a string
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // This effect runs once on mount to check for an existing job
  useEffect(() => {
    const savedJobId = localStorage.getItem('activeJobId');
    if (savedJobId) {
      setJobId(savedJobId);
      setUploadState('processing');
    }
  }, []);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadState === 'idle') setIsDragging(true);
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
    if (uploadState !== 'idle') return;

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv'))) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (uploadState !== 'idle') return;
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setProgressMessage('Uploading file...');
    try {
      const { jobId } = await onUpload();
      setJobId(jobId);
      // Save the active job ID to localStorage
      localStorage.setItem('activeJobId', jobId);
      setUploadState('processing');
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadState('error');
      setProgressMessage('Failed to start upload process.');
    }
  };

  const resetState = () => {
    setUploadState('idle');
    onFileSelect(null);
    setJobId(null);
    setProgress(0);
    setProgressMessage('');
    // Clear the job ID from storage on reset
    localStorage.removeItem('activeJobId');
  };

  // This effect will start polling when a jobId is set
useEffect(() => {
  const poll = async (currentJobId: string) => {
    try {
      const { state, progress: jobProgress, error } = await getJobProgress(currentJobId);
      
      if (state === 'completed') {
        setUploadState('success');
        setProgress(100);
        setProgressMessage('Processing complete!');
        localStorage.removeItem('activeJobId');
        if (onSuccess) onSuccess();
        return;
      }
      
      if (state === 'failed') {
        setUploadState('error');
        setProgressMessage(error || 'An error occurred during processing.');
        localStorage.removeItem('activeJobId');
        return;
      }

      // If still processing, update progress and schedule the next poll
      setProgress(jobProgress?.percentage || 0);
      setProgressMessage(jobProgress?.message || 'Processing...');
      pollIntervalRef.current = setTimeout(() => poll(currentJobId), 2000);

    } catch (err) {
      console.error("Polling error:", err);
      setUploadState('error');
      setProgressMessage('Could not fetch progress.');
      localStorage.removeItem('activeJobId');
    }
  };

  if (uploadState === 'processing' && jobId) {
    poll(jobId);
  }

  return () => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
    }
  };
}, [uploadState, jobId, onSuccess]);

  const steps = [
    'Go to Reports > List Reports > Item Listing',
    'Customize the report to include the Name and SKU fields.',
    'Export the report as an CSV file.',
    'Add a new "Barcode" column and fill in the unique barcodes.',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Paper elevation={0} sx={{ 
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        backgroundColor: theme.palette.background.paper, 
        minHeight: 'auto',
        overflow: 'hidden'
      }}>
        <title>Smart Picker | Upload Data</title>
        
        {/* Upload Section */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Upload Product Data
          </Typography>

          {uploadState === 'idle' && (
            <>
              <Typography variant="body1" component="p" gutterBottom sx={{ mb: 3 }}>
                Upload your CSV file containing product data. Ensure it follows the format guide below.
              </Typography>
              <Box
                sx={{
                  border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.grey[300]}`,
                  borderRadius: 2,
                  padding: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: isDragging ? 'rgba(59,130,246,0.05)' : 'transparent',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: 'rgba(59,130,246,0.02)'
                  }
                }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
                <CloudUploadIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
                {selectedFile ? (
                  <Typography variant="body2" sx={{ mt: 2, color: theme.palette.text.secondary }}>
                    Selected file: <strong>{selectedFile.name}</strong>
                  </Typography>
                ) : (
                  <Typography>Drag & drop a CSV file here or click to select</Typography>
                )}
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUploadClick}
                disabled={!selectedFile}
                sx={{ 
                  mt: 3,
                  background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                  }
                }}
                fullWidth
                size="large"
              >
                Upload File
              </Button>
            </>
          )}

          {(uploadState === 'uploading' || uploadState === 'processing') && (
            <Box sx={{ textAlign: 'center', padding: '40px 0' }}>
              <Typography variant="h6" sx={{mb: 2}}>{progressMessage}</Typography>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)'
                    }
                  }}
                />
              </Box>
              <Typography sx={{mt: 1, fontWeight: 500}}>{`${Math.round(progress)}%`}</Typography>
            </Box>
          )}

          {uploadState === 'success' && (
            <Box sx={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 60, color: 'success.main' }} />
              <Typography variant="h6" sx={{mt: 2}}>Upload and Processing Successful!</Typography>
              <Button 
                variant="outlined" 
                onClick={resetState} 
                sx={{mt: 3}}
                size="large"
              >
                Upload Another File
              </Button>
            </Box>
          )}

          {uploadState === 'error' && (
            <Box sx={{ textAlign: 'center', padding: '40px 0' }}>
              <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main' }} />
              <Typography variant="h6" sx={{mt: 2}}>An Error Occurred</Typography>
              <Typography variant="body1">{progressMessage}</Typography>
              <Button 
                variant="outlined" 
                onClick={resetState} 
                sx={{mt: 3}}
                size="large"
              >
                Try Again
              </Button>
            </Box>
          )}
        </Box>

        {/* Format Guide Section */}
        <Divider />
        <Box sx={{ p: 3, backgroundColor: 'grey.50' }}>
          <Stack spacing={4}>
            {/* CSV File Structure */}
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <DescriptionOutlinedIcon color="primary" sx={{ fontSize: '2rem' }} />
                <Box>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                    CSV File Structure
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your uploaded CSV file must follow this structure.
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'rgba(59,130,246,0.02)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      <Stack spacing={1} alignItems="center">
                        <LabelOutlinedIcon color="primary" />
                        <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 600 }}>
                          Product Name
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Must match the product names in QuickBooks exactly.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'rgba(59,130,246,0.02)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      <Stack spacing={1} alignItems="center">
                        <PinOutlinedIcon color="primary" />
                        <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 600 }}>
                          SKU
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Must match the SKU values defined in QuickBooks.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'rgba(59,130,246,0.02)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      <Stack spacing={1} alignItems="center">
                        <QrCode2OutlinedIcon color="primary" />
                        <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 600 }}>
                          Barcode
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Must contain a unique barcode for each product.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Stack>

            {/* Exporting from QuickBooks */}
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <FileUploadOutlinedIcon color="primary" sx={{ fontSize: '2rem' }} />
                <Box>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                    Exporting from QuickBooks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Follow these steps to get your product list.
                  </Typography>
                </Box>
              </Stack>

              <List sx={{ py: 0 }}>
                {steps.map((text, index) => (
                  <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Typography
                        sx={{
                          fontWeight: 'bold',
                          color: 'primary.main',
                          fontSize: '0.875rem'
                        }}
                      >
                        {index + 1}.
                      </Typography>
                    </ListItemIcon>
                    <ListItemText 
                      primary={text} 
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Stack>

            {/* Final Note */}
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 'bold' }}>Important</AlertTitle>
              Ensure that the <strong>Product Name</strong> and <strong>SKU</strong> in your CSV file match exactly with those in QuickBooks to avoid data synchronization errors.
            </Alert>
          </Stack>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default FileUpload;