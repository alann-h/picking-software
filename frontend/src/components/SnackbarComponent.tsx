import React from 'react';
import { Snackbar, Alert, Box } from '@mui/material';
import { shakeStyle } from '../animation';
import { useSnackbarContext } from './SnackbarContext';

const SnackbarComponent: React.FC = () => {
  const { openSnackbar, handleCloseSnackbar, snackbarMessage, snackbarSeverity } = useSnackbarContext();

  return (
    <Snackbar 
      open={openSnackbar} 
      autoHideDuration={6000} 
      onClose={handleCloseSnackbar} 
      sx={{ height: '1.25rem', m: '1.5rem 0'}}
    >
      <Box
        sx={{ 
          width: '100%',
          ...(snackbarSeverity === 'error' && shakeStyle)
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%', fontSize: '1.25rem' }}
        >
          {snackbarMessage}
        </Alert>
      </Box>
    </Snackbar>
  );
};

export default SnackbarComponent;
