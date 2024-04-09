import React, { useEffect } from 'react';
import { Button, Box } from '@mui/material';
import { login, verifyUser } from '../api/auth';
import { getUserId, setToken } from '../utils/storage';
import { useSnackbarContext } from './SnackbarContext';


const Login: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();

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
          handleOpenSnackbar(err.message, 'error');
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
    >
      <Button
        variant="contained"
        color="primary"
        onClick={handleLoginClick}
        sx={{ fontSize: '1.2rem', padding: '10px 20px' }}
      >
        Login with QuickBooks
      </Button>
    </Box>
  );
};

export default Login;
