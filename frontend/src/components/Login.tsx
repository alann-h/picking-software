import React, { useEffect } from 'react';
import { Button, Box, Typography, Container } from '@mui/material';
import { login, verifyUser } from '../api/auth';
import { getUserId, setToken, deleteToken } from '../utils/storage';
import { useSnackbarContext } from './SnackbarContext';

const Login: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      verifyUser(userId)
        .then((response) => {
          if (response.isValid) {
            setToken(response.accessToken);
            window.location.href = '/dashboard';
          }
        })
        .catch(() => {
          deleteToken();
        });
    }
  }, [handleOpenSnackbar]);

  const handleLoginClick = () => {
    login()
      .then((authUri: string) => (window.location.href = authUri))
      .catch((err: Error) => {
        handleOpenSnackbar(err.message, 'error');
      });
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(to right, #ece9e6, #ffffff)',
        padding: '20px',
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            margin: '10px',
          }}
        >
          <Typography variant="h1" gutterBottom>
            Welcome to SmartPicker
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Your smart solution for efficient logistics
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            SmartPicker is a web application that integrates with QuickBooks to add barcode scanning to picking slips, enhancing your logistic operations.
          </Typography>
          <Box
            sx={{
              margin: '30px 0',
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handleLoginClick}
              sx={{ fontSize: '1rem', padding: '10px 20px' }}
            >
              Login with QuickBooks
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Powered By
          </Typography>
          <Box sx={{ marginTop: '10px' }}>
            <img
              src="/quickbooks-logo.png"
              alt="QuickBooks Logo"
              style={{ width: '150px' }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
