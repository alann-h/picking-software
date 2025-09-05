import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper
} from '@mui/material';
import { loginWithCredentials, verifyUser, requestPasswordReset } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import { useNavigate } from 'react-router-dom';
import LoadingWrapper from './LoadingWrapper';
import { motion } from 'framer-motion';

import { QBO_AUTH_URI, XERO_AUTH_URI } from '../api/config';
import SEO from './SEO';
import LoginForm from './login/LoginForm';
import SocialLoginButtons from './login/SocialLoginButtons';
import UserSessionIndicator from './login/UserSessionIndicator';
import ForgotPasswordModal from './login/ForgotPasswordModal';
import LoginErrorBoundary from './login/LoginErrorBoundary';
import { LoginPageSkeleton, UserSessionIndicatorSkeleton } from './Skeletons';
import { useLoginError } from '../hooks/useLoginError';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  const { error, clearError, handleLoginError } = useLoginError();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null);
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [preFilledEmail, setPreFilledEmail] = useState('');

  useEffect(() => {
    verifyUser()
      .then((response) => {
        if (response.isValid && response.user && response.user.userId) {
          // Check if user has explicitly chosen to auto-login
          const hasRememberMe = localStorage.getItem('rememberMe') === 'true';

          if (hasRememberMe) {
            // User has active session and chose "Remember Me" - redirect directly to dashboard
            navigate('/dashboard');
          } else {
            // User has active session but didn't choose "Remember Me" - show welcome back message
            setCurrentUser({
              email: response.user.email || 'Unknown User',
              name: response.user.name
            });
            setPreFilledEmail(response.user.email || '');
            setLoading(false);
          }
        } else {
          // No valid session - show generic welcome message
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error verifying user:', error);
        handleLoginError(error);
        setLoading(false);
      });
  }, [navigate, handleLoginError]);

  const handleSwitchAccount = () => {
    setShowSwitchAccount(true);
    setCurrentUser(null);
    setPreFilledEmail('');
    localStorage.removeItem('rememberMe');
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleResetPassword = async (email: string) => {
    try {
      await requestPasswordReset(email);
      handleOpenSnackbar('Password reset link sent! Check your email.', 'success');
      setShowForgotPassword(false);
    } catch (error) {
      console.error('Password reset error:', error);
      handleOpenSnackbar('Failed to send password reset link. Please try again.', 'error');
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
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

  const handleCredentialLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    clearError(); // Clear any previous errors

    try {
      const user = await loginWithCredentials(data.email, data.password, rememberMe);

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
      handleLoginError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoginErrorBoundary>
      <SEO 
        title="Login | Smart Picker - Order Picking Software"
        description="Sign in to Smart Picker - the smart order picking app with barcode scanning and digital lists. Access your dashboard and manage warehouse operations."
        keywords="login, sign in, Smart Picker, order picking software, warehouse management"
      />
      <LoadingWrapper isLoading={loading} height="100vh" fallback={<LoginPageSkeleton />}>
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
                {/* User Session Indicator */}
                {currentUser && !showSwitchAccount ? (
                  <UserSessionIndicator
                    currentUser={currentUser}
                    onSwitchAccount={handleSwitchAccount}
                  />
                ) : loading ? (
                  <UserSessionIndicatorSkeleton />
                ) : null}

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
                    {showSwitchAccount ? 'Switch Account' : (currentUser ? 'Welcome Back!' : 'Welcome')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                    {showSwitchAccount 
                      ? 'Sign in with different credentials' 
                      : currentUser 
                        ? 'Enter your password to continue' 
                        : 'Sign in to your account'
                    }
                  </Typography>
                </Box>

                {/* Login Form */}
                <LoginForm
                  onSubmit={handleCredentialLogin}
                  isSubmitting={isSubmitting}
                  rememberMe={rememberMe}
                  onRememberMeChange={setRememberMe}
                  onForgotPassword={handleForgotPassword}
                  preFilledEmail={preFilledEmail}
                  showSwitchAccount={showSwitchAccount}
                  error={error}
                />

                {/* Social Login Buttons */}
                <SocialLoginButtons
                  onQuickBooksLogin={handleQuickBooksLogin}
                  onXeroLogin={handleXeroLogin}
                  isSubmitting={isSubmitting}
                />

              </Paper>
            </motion.div>
          </Container>
        </Box>
      </LoadingWrapper>

      {/* Password Reset Modal */}
      <ForgotPasswordModal
        open={showForgotPassword}
        onClose={handleCloseForgotPassword}
        onSubmit={handleResetPassword}
        initialEmail={preFilledEmail}
      />
    </LoginErrorBoundary>
  );
};

export default Login;