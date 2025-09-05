import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPassword } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import SEO from './SEO';
import LoadingWrapper from './LoadingWrapper';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/\d/, { message: "Password must contain at least one number" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOpenSnackbar } = useSnackbarContext();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setTokenError('Invalid reset link. Please request a new password reset.');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    
    setIsSubmitting(true);
    try {
      await resetPassword(token, data.password);
      handleOpenSnackbar('Password reset successfully! You can now log in with your new password.', 'success');
      navigate('/login');
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to reset password. Please try again.';
      handleOpenSnackbar(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  if (tokenError) {
    return (
      <LoadingWrapper isLoading={false}>
        <SEO 
          title="Reset Password - Smart Picker" 
          description="Reset your Smart Picker password"
        />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
            py: 4
          }}
        >
          <Container maxWidth="sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Paper
                elevation={24}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography 
                    component="h1" 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      mb: 2
                    }}
                  >
                    Invalid Reset Link
                  </Typography>
                </Box>
                
                <Alert severity="error" sx={{ mb: 3 }}>
                  {tokenError}
                </Alert>
                
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate('/login')}
                  sx={{
                    background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
                    },
                    py: 1.5,
                    borderRadius: 2
                  }}
                >
                  Back to Login
                </Button>
              </Paper>
            </motion.div>
          </Container>
        </Box>
      </LoadingWrapper>
    );
  }

  return (
    <LoadingWrapper isLoading={false}>
      <SEO 
        title="Reset Password - Smart Picker" 
        description="Reset your Smart Picker password"
      />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4
        }}
      >
        <Container maxWidth="sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Paper
              elevation={24}
              sx={{
                p: 4,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
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
                  Reset Password
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                  Enter your new password below
                </Typography>
              </Box>

              {/* Form */}
              <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Stack spacing={3}>
                  {/* New Password */}
                  <TextField
                    {...register('password')}
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />

                  {/* Confirm Password */}
                  <TextField
                    {...register('confirmPassword')}
                    fullWidth
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    disabled={isSubmitting}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={!isValid || isSubmitting || !passwordValue || !confirmPasswordValue}
                    sx={{
                      background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
                      },
                      '&:disabled': {
                        background: '#E5E7EB',
                        color: '#9CA3AF',
                      },
                      py: 1.5,
                      borderRadius: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600
                    }}
                  >
                    {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                  </Button>

                  {/* Back to Login */}
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => navigate('/login')}
                    disabled={isSubmitting}
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Back to Login
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </motion.div>
        </Container>
      </Box>
    </LoadingWrapper>
  );
};

export default ResetPassword;
