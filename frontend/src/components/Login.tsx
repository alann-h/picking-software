import React, { useEffect, useState } from 'react';
import { 
  Button, 
  TextField, 
  Box, 
  Typography, 
  Container, 
  InputAdornment, 
  IconButton,
  Paper,
  Stack,
  Divider,
  Alert,
  useTheme,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email, 
  Lock, 
  Business,
  ArrowForward,
  SwitchAccount,
  Person
} from '@mui/icons-material';
import { loginWithCredentials, verifyUser, logout } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import { useNavigate } from 'react-router-dom';
import LoadingWrapper from './LoadingWrapper';
import { z } from 'zod';
import { motion } from 'framer-motion';

import { AUTH_URI } from '../api/config';
import SEO from './SEO';

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
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
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null);
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    verifyUser()
      .then((response) => {
        if (response.isValid && response.user && response.user.userId) {
          const hasRememberMe = localStorage.getItem('rememberMe') === 'true';
          
          if (hasRememberMe) {
            navigate('/dashboard');
          } else {
            setCurrentUser({
              email: response.user.email || 'Unknown User',
              name: response.user.name
            });
            setShowSwitchAccount(true);
            setLoading(false);
          }
        } else {
          console.log('Session invalid or expired:', response);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error verifying user:', error);
        setLoading(false);
      });
  }, [navigate]);

  const handleSwitchAccount = () => {
    setShowSwitchAccount(false);
    setCurrentUser(null);
    localStorage.removeItem('rememberMe');
  };

  const handleContinueAsCurrentUser = () => {
    navigate('/dashboard');
  };

  const handleForceLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('rememberMe');
      setShowSwitchAccount(false);
      setCurrentUser(null);
      setLoading(false);
    }
  };

  const handleQuickBooksLogin = () => {
    setIsSubmitting(true);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
    const authUriWithRememberMe = rememberMe ? `${AUTH_URI}?rememberMe=true` : AUTH_URI;
    window.location.href = authUriWithRememberMe;
  };

  const validateField = (name: string, value: string) => {
    try {
      if (name === 'email') {
        z.email().parse(value);
        return '';
      } else if (name === 'password') {
        z.string().parse(value);
        return '';
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues[0].message;
      }
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    const error = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: error
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

    // Check if there are any validation errors
    const hasValidationErrors = Object.values(validationErrors).some(error => error !== '');
    if (hasValidationErrors) {
      return;
    }

    const validationResult = loginSchema.safeParse(formData);

    if (!validationResult.success) {
      setErrors(z.treeifyError(validationResult.error));
      return;
    }

    setErrors(null);
    setIsSubmitting(true);

    try {
      const user = await loginWithCredentials(validationResult.data.email, validationResult.data.password, rememberMe);

      if (user.qboReAuthRequired) {
        handleOpenSnackbar('Your QuickBooks connection has expired. Redirecting to reconnect...', 'warning');

        setTimeout(() => {
          handleQuickBooksLogin();
        }, 3000);

      } else {
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        navigate('/dashboard');
      }
    } catch (err) {
      handleOpenSnackbar((err as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.email && formData.password && !Object.values(validationErrors).some(error => error !== '');

  return (
    <>
      <SEO 
        title="Login | Smart Picker - Order Picking Software"
        description="Sign in to Smart Picker - the smart order picking app with barcode scanning and digital lists. Access your dashboard and manage warehouse operations."
        keywords="login, sign in, Smart Picker, order picking software, warehouse management"
      />
      <LoadingWrapper isLoading={loading} height="100vh">
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
            px: 2
          }}
        >
          <Container component="main" maxWidth="sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Paper
                elevation={8}
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 20px 40px rgba(30, 64, 175, 0.15)'
                }}
              >
                {/* Current User Info - Show when user is authenticated but wants to switch */}
                {showSwitchAccount && currentUser && (
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(59, 130, 246, 0.08)', borderRadius: 2, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Person sx={{ color: '#3B82F6', mr: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E40AF' }}>
                        Currently signed in as:
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {currentUser.name || 'User'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {currentUser.email}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        onClick={handleContinueAsCurrentUser}
                        sx={{
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #059669, #047857)',
                          }
                        }}
                      >
                        Continue as Current User
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<SwitchAccount />}
                        onClick={handleSwitchAccount}
                        sx={{
                          borderColor: '#3B82F6',
                          color: '#3B82F6',
                          '&:hover': {
                            borderColor: '#1E40AF',
                            backgroundColor: 'rgba(59, 130, 246, 0.04)',
                          }
                        }}
                      >
                        Switch Account
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        onClick={handleForceLogout}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.04)',
                          }
                        }}
                      >
                        Force Logout
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography 
                    component="h1" 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 1
                    }}
                  >
                    {showSwitchAccount ? 'Switch Account' : 'Welcome Back'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                    {showSwitchAccount ? 'Sign in with different credentials' : 'Sign in to Smart Picker'}
                  </Typography>
                </Box>

                {/* Form */}
                <Box component="form" onSubmit={handleCredentialLogin} noValidate>
                  <Stack spacing={3}>
                    <TextField
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      autoComplete="email"
                      autoFocus
                      value={formData.email}
                      onChange={handleInputChange}
                      error={!!validationErrors.email || !!errors?.properties?.email?.errors.length}
                      helperText={validationErrors.email || errors?.properties?.email?.errors[0]}
                      variant="outlined"
                      disabled={isSubmitting}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#3B82F6',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1E40AF',
                          },
                        },
                      }}
                    />
                    
                    {/* Password field */}
                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      error={!!validationErrors.password}
                      helperText={validationErrors.password}
                      sx={{ mt: 2 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    {/* Remember Me Checkbox */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          sx={{
                            color: '#3B82F6',
                            '&.Mui-checked': {
                              color: '#1E40AF',
                            },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          Remember me for 30 days
                        </Typography>
                      }
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={!isFormValid || isSubmitting}
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 8px 25px rgba(30, 64, 175, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 35px rgba(30, 64, 175, 0.4)',
                        },
                        '&:disabled': {
                          background: '#E5E7EB',
                          color: '#9CA3AF',
                          transform: 'none',
                          boxShadow: 'none',
                        }
                      }}
                    >
                      {isSubmitting ? 'Signing In...' : (showSwitchAccount ? 'Switch Account' : 'Sign In')}
                    </Button>
                  </Stack>
                </Box>

                {/* Divider */}
                <Box sx={{ my: 3, display: 'flex', alignItems: 'center' }}>
                  <Divider sx={{ flex: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                    or continue with
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>

                {/* QuickBooks Login */}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleQuickBooksLogin}
                  disabled={isSubmitting}
                  startIcon={<Business />}
                  endIcon={<ArrowForward />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: '#10B981',
                    color: '#10B981',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#059669',
                      backgroundColor: 'rgba(16, 185, 129, 0.04)',
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      borderColor: '#E5E7EB',
                      color: '#9CA3AF',
                      transform: 'none',
                    }
                  }}
                >
                  Sign in with QuickBooks
                </Button>


              </Paper>
            </motion.div>
          </Container>
        </Box>
      </LoadingWrapper>
    </>
  );
};

export default Login;