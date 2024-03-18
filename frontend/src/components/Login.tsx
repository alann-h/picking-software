import React, { useState, useEffect } from 'react';
import { Button, Snackbar, Alert, Box } from '@mui/material';
import { login, verifyUser } from '../api/auth';
import { getUserId, setToken } from '../utils/storage';

const Login: React.FC = () => {
  const [error, setError] = useState<string>('');
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      verifyUser(userId)
        .then((response) => {
          if (response.isValid) {
            setToken(response.access_token);
            window.location.href = '/dashboard';
          }
        })
        .catch((err: Error) => {
          setError(err.message);
          setOpenSnackbar(true);
        });
    }
  }, []);

  const handleLoginClick = () => {
    login()
      .then((authUri: string) => (window.location.href = authUri))
      .catch((err: Error) => {
        setError(err.message);
        setOpenSnackbar(true);
      });
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };
  
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <Button
        variant="contained"
        color="primary"
        onClick={handleLoginClick}
        sx={{ fontSize: '1.2rem', padding: '10px 20px' }}
      >
        Login with QuickBooks
      </Button>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
