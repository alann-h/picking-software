import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSnackbarContext } from './SnackbarContext';

const SnackbarComponent: React.FC = () => {
  const { openSnackbar, handleCloseSnackbar, snackbarMessage, snackbarSeverity } = useSnackbarContext();

  return (
    <Snackbar
      open={openSnackbar}
      onClose={handleCloseSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      sx={{ height: 'auto' }}
    >
      <Alert
        onClose={handleCloseSnackbar}
        severity={snackbarSeverity}
        sx={{ width: '100%' }}
      >
        {snackbarMessage}
      </Alert>
    </Snackbar>
  );
};

export default SnackbarComponent;