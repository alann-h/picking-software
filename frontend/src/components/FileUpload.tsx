import React, { useRef, DragEvent, ChangeEvent, useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, useTheme, LinearProgress } from '@mui/material';
import { CloudUpload as CloudUploadIcon, CheckCircleOutline as CheckCircleOutlineIcon, ErrorOutline as ErrorOutlineIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { getJobProgress } from '../api/products';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onUpload: () => Promise<{ jobId: number }>;
  selectedFile: File | null;
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onUpload, selectedFile, onSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [jobId, setJobId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const pollIntervalRef = useRef<NodeJS.Timeout>();

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
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
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
  };

  // This effect will start polling when a jobId is set
  useEffect(() => {
    const pollProgress = async () => {
      if (!jobId) return;

      try {
        const response = await getJobProgress(jobId);
        const { state, progress: jobProgress } = response;
        
        setProgress(jobProgress?.percentage || 0);
        setProgressMessage(jobProgress?.message || 'Processing...');

        if (state === 'completed') {
          setUploadState('success');
          setProgress(100);
          setProgressMessage('Processing complete!');
          clearInterval(pollIntervalRef.current);
          if (onSuccess) {
            onSuccess();
          }
        } else if (state === 'failed') {
          setUploadState('error');
          setProgressMessage('An error occurred during processing.');
          clearInterval(pollIntervalRef.current);
        }
      } catch (error) {
        console.error("Polling error:", error);
        setUploadState('error');
        setProgressMessage('Could not fetch progress.');
        clearInterval(pollIntervalRef.current);
      }
    };

    if (uploadState === 'processing' && jobId) {
      pollIntervalRef.current = setInterval(pollProgress, 2000); // Poll every 2 seconds
    }

    // Cleanup interval on component unmount or state change
    return () => {
      clearInterval(pollIntervalRef.current);
    };
  }, [uploadState, jobId, onSuccess]);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Paper elevation={3} sx={{ padding: 3, backgroundColor: theme.palette.background.paper, minHeight: '350px' }}>
        <Helmet>
          <title>Smart Picker | Upload Data</title>
        </Helmet>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Upload Product Data
        </Typography>

        {uploadState === 'idle' && (
            <>
              <Typography variant="body1" component="p" gutterBottom>
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
                  backgroundColor: isDragging ? 'rgba(0, 123, 255, 0.05)' : 'transparent',
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
                {selectedFile ? (
                    <Typography variant="body2" sx={{ mt: 2, color: theme.palette.text.secondary }}>
                      Selected file: <strong>{selectedFile.name}</strong>
                    </Typography>
                ) : (
                    <Typography>Drag & drop a file here or click to select</Typography>
                )}
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUploadClick}
                disabled={!selectedFile}
                sx={{ mt: 3 }}
                fullWidth
              >
                Upload File
              </Button>
            </>
        )}

        {(uploadState === 'uploading' || uploadState === 'processing') && (
          <Box sx={{ textAlign: 'center', padding: '40px 0' }}>
            <Typography variant="h6" sx={{mb: 2}}>{progressMessage}</Typography>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
            <Typography sx={{mt: 1}}>{`${Math.round(progress)}%`}</Typography>
          </Box>
        )}

        {uploadState === 'success' && (
          <Box sx={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 60, color: 'success.main' }} />
            <Typography variant="h6" sx={{mt: 2}}>Upload and Processing Successful!</Typography>
            <Button variant="outlined" onClick={resetState} sx={{mt: 3}}>Upload Another File</Button>
          </Box>
        )}

        {uploadState === 'error' && (
          <Box sx={{ textAlign: 'center', padding: '40px 0' }}>
            <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main' }} />
            <Typography variant="h6" sx={{mt: 2}}>An Error Occurred</Typography>
            <Typography variant="body1">{progressMessage}</Typography>
            <Button variant="outlined" onClick={resetState} sx={{mt: 3}}>Try Again</Button>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

export default FileUpload;