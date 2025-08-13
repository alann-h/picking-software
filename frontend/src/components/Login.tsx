import React, { useEffect, useState } from 'react';
import { Button, TextField, Box, Typography, Container, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { loginWithCredentials, verifyUser } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import { useNavigate } from 'react-router-dom';
import LoadingWrapper from './LoadingWrapper';
import { z } from 'zod';

import { AUTH_URI } from '../api/config';
import SEO from './SEO';

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
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

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = loginSchema.safeParse(formData);

    if (!validationResult.success) {
      setErrors(z.treeifyError(validationResult.error));
      return;
    }

    setErrors(null);
    setIsSubmitting(true);

    try {
      const user = await loginWithCredentials(validationResult.data.email, validationResult.data.password);

      if (user.qboReAuthRequired) {
        handleOpenSnackbar('Your QuickBooks connection has expired. Redirecting to reconnect...', 'warning');

        setTimeout(() => {
          handleQuickBooksLogin();
        }, 3000);

      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      handleOpenSnackbar((err as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title="Login | Smart Picker - Order Picking Software"
        description="Sign in to Smart Picker - the smart order picking app with barcode scanning and digital lists. Access your dashboard and manage warehouse operations."
        keywords="login, sign in, Smart Picker, order picking software, warehouse management"
      />
      <LoadingWrapper isLoading={loading} height="100vh">
        <Container component="main" maxWidth="xs">
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 4,
              borderRadius: 2,
              boxShadow: 3,
              backgroundColor: 'background.paper',
            }}
          >
          <Typography component="h1" variant="h5" color="primary" fontWeight="bold" sx={{ mb: 3 }}>
            Welcome to Smart Picker
          </Typography>
          <Box component="form" onSubmit={handleCredentialLogin} noValidate sx={{ width: '100%' }}> {/* Adjusted width */}
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
              error={!!errors?.properties?.email?.errors.length}
              helperText={errors?.properties?.email?.errors[0]}
              variant="outlined"
              disabled={isSubmitting}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange}
              error={!!errors?.properties?.password?.errors.length}
              helperText={errors?.properties?.password?.errors[0]}
              variant="outlined"
              disabled={isSubmitting} 
              slotProps={{ 
                  input: {
                    endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                  }
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isSubmitting} 
            >
              Sign In
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
            — Or sign in with —
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleQuickBooksLogin}
            sx={{ py: 1.5 }}
            color='success'
            disabled={isSubmitting} 
          >
            Sign in with QuickBooks
          </Button>
        </Box>
      </Container>
    </LoadingWrapper>
    </>
  );
};

export default Login;