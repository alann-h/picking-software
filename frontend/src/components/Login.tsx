import React, { useEffect, useState } from 'react';
import { Button, TextField, Box, Typography, Container } from '@mui/material';
import { loginWithQb, loginWithCredentials, verifyUser } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
      verifyUser()
        .then((response) => {
          if (response.isValid) {
            navigate('/dashboard');
          }
        })
        .catch(() => {
        });
    }, [handleOpenSnackbar, navigate]);

  const handleQuickBooksLogin = () => {
    loginWithQb()
      .then((authUri: string) => (window.location.href = authUri))
      .catch((err: Error) => {
        handleOpenSnackbar(err.message, 'error');
      });
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginWithCredentials(email, password);
      navigate('/dashboard');
    } catch (err) {
      handleOpenSnackbar((err as Error).message, 'error');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5" color="primary" fontWeight="bold">
          Sign in to SmartPicker
        </Typography>
        <Box component="form" onSubmit={handleCredentialLogin} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
        </Box>
        <Typography variant="body1" sx={{ mt: 2, mb: 2 }}>
          Or
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          onClick={handleQuickBooksLogin}
          sx={{
            mt: 1,
            mb: 2,
            borderColor: '#2CA01C',
            color: '#2CA01C',
            '&:hover': {
              borderColor: '#238A14',
              backgroundColor: 'rgba(44, 160, 28, 0.04)',
            },
          }}
        >
          Sign in with QuickBooks
        </Button>
      </Box>
    </Container>
  );
};

export default Login;