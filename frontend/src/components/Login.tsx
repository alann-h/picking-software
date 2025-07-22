import React, { useEffect, useState } from 'react';
import { Button, TextField, Box, Typography, Container } from '@mui/material';
import { loginWithCredentials, verifyUser } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import { useNavigate } from 'react-router-dom';
import LoadingWrapper from './LoadingWrapper';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';

import { AUTH_URI } from '../api/config';

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

type LoginForm = z.infer<typeof loginSchema>;
interface ErrorTree {
  errors: string[];
  properties?: {
    [key: string]: ErrorTree;
  }
}
type FormErrors = ErrorTree | null;


const Login: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyUser()
      .then((response) => {
        if (response.isValid) {
          navigate('/dashboard');
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [handleOpenSnackbar, navigate]);

  const handleQuickBooksLogin = () => {
    window.location.href = AUTH_URI;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors?.properties?.[name]) {
      setErrors(prev => {
        if (!prev?.properties) {
          return prev;
        }

        const newProperties = { ...prev.properties };
        
        delete newProperties[name];

        const newState: ErrorTree = {
          errors: prev.errors,
          properties: newProperties,
        };

        return newState;
      });
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = loginSchema.safeParse(formData);

    if (!validationResult.success) {
      setErrors(z.treeifyError(validationResult.error));
      return;
    }

    setErrors(null);
    try {
      // 1. Capture the user object returned from your API call
      const user = await loginWithCredentials(validationResult.data.email, validationResult.data.password);

      // 2. Check for the re-authentication flag from the backend
      if (user.qboReAuthRequired) {
        handleOpenSnackbar('Your QuickBooks connection has expired. Redirecting to reconnect...', 'warning');
        
        setTimeout(() => {
          handleQuickBooksLogin();
        }, 3000); 

      } else {
        // 4. If no re-auth is needed, proceed to the dashboard as normal
        navigate('/dashboard');
      }
    } catch (err) {
      handleOpenSnackbar((err as Error).message, 'error');
    }
  };

  return (
    <LoadingWrapper isLoading={loading} height="100vh">
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Helmet>
            <title>Smart Picker | Login</title>
          </Helmet>
          <Typography component="h1" variant="h5" color="primary" fontWeight="bold">
            Sign in to Smart Picker
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
              value={formData.email}
              onChange={handleInputChange}
              // 3. Update how errors are checked and displayed for the tree structure.
              error={!!errors?.properties?.email?.errors.length}
              helperText={errors?.properties?.email?.errors[0]}
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
              value={formData.password}
              onChange={handleInputChange}
              error={!!errors?.properties?.password?.errors.length}
              helperText={errors?.properties?.password?.errors[0]}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="success"
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
          >
            Sign in with QuickBooks
          </Button>
        </Box>
      </Container>
    </LoadingWrapper>
  );
};

export default Login;
