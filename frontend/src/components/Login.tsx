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
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email, 
  Business,
  ArrowForward,
  SwitchAccount,
  Person
} from '@mui/icons-material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { loginWithCredentials, verifyUser, logout } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import { useNavigate } from 'react-router-dom';
import LoadingWrapper from './LoadingWrapper';
import { z } from 'zod';
import { motion } from 'framer-motion';

import { QBO_AUTH_URI, XERO_AUTH_URI } from '../api/config';
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
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    verifyUser()
      .then((response) => {
        if (response.isValid && response.user && response.user.userId) {
          // Check if user has explicitly chosen to auto-login
          const hasRememberMe = localStorage.getItem('rememberMe') === 'true';

          console.log('hasRememberMe', hasRememberMe);
          if (hasRememberMe) {
            // Only auto-login if user explicitly chose "Remember Me"
            navigate('/dashboard');
          } else {
            // Show login form with auto-filled email for convenience
            setFormData(prev => ({
              ...prev,
              email: response.user.email || ''
            }));
            setCurrentUser({
              email: response.user.email || 'Unknown User',
              name: response.user.name
            });
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
    setShowSwitchAccount(true);
    setCurrentUser(null);
    setFormData({ email: '', password: '' });
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
      setFormData({ email: '', password: '' });
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(formData.email);
    setShowForgotPassword(true);
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      handleOpenSnackbar('Please enter your email address', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      // TODO: Implement password reset API call
      // await resetPassword(resetEmail);
      
      // For now, simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      handleOpenSnackbar('Password reset link sent to your email', 'success');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      handleOpenSnackbar('Failed to send reset link. Please try again.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
  };

  const handleQuickBooksLogin = () => {
    setIsSubmitting(true);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
    const authUriWithRememberMe = rememberMe ? `${QBO_AUTH_URI}?rememberMe=true` : QBO_AUTH_URI;
    window.location.href = authUriWithRememberMe;
  };

  const handleXeroLogin = () => {
    setIsSubmitting(true);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
    const xeroAuthUriWithRememberMe = rememberMe ? `${XERO_AUTH_URI}?rememberMe=true` : XERO_AUTH_URI;
    window.location.href = xeroAuthUriWithRememberMe;
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


                {/* Auto-filled email indicator */}
                {currentUser && !showSwitchAccount && (
                  <Box sx={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 2,
                    padding: 2,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="body2" color="text.secondary">
                        Signed in as <strong>{currentUser.email}</strong>
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="text"
                      onClick={handleSwitchAccount}
                      sx={{ color: 'primary.main', textTransform: 'none' }}
                    >
                      Switch Account
                    </Button>
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
                    {showSwitchAccount ? 'Sign in with different credentials' : 'Enter your password to continue'}
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
                      slotProps={{
                        input: {
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
                        },
                      }}
                    />

                    {/* Forgot Password Link */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleForgotPassword()}
                        sx={{
                          color: '#3B82F6',
                          textTransform: 'none',
                          fontSize: '0.875rem',
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.04)',
                          }
                        }}
                      >
                        Forgot Password?
                      </Button>
                    </Box>

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
                      {isSubmitting ? 'Signing In...' : (showSwitchAccount ? 'Switch Account' : 'Continue')}
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

                {/* Xero Login */}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleXeroLogin}
                  disabled={isSubmitting}
                  startIcon={<AccountBalanceIcon />}
                  endIcon={<ArrowForward />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    borderColor: '#6366F1',
                    color: '#6366F1',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    mt: 2,
                    '&:hover': {
                      borderColor: '#4F46E5',
                      backgroundColor: 'rgba(99, 102, 241, 0.04)',
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      borderColor: '#E5E7EB',
                      color: '#9CA3AF',
                      transform: 'none',
                    }
                  }}
                >
                  Sign in with Xero
                </Button>


              </Paper>
            </motion.div>
          </Container>
        </Box>
      </LoadingWrapper>

      {/* Password Reset Modal */}
      <Dialog 
        open={showForgotPassword} 
        onClose={handleCloseForgotPassword}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          fontWeight: 600,
          background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Reset Password
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            variant="outlined"
            disabled={isResettingPassword}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleCloseForgotPassword}
            disabled={isResettingPassword}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleResetPassword}
            variant="contained"
            disabled={!resetEmail || isResettingPassword}
            sx={{
              background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
              '&:hover': {
                background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
              },
              '&:disabled': {
                background: '#E5E7EB',
                color: '#9CA3AF',
              }
            }}
          >
            {isResettingPassword ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Login;