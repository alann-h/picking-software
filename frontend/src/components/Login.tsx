import React, { useEffect, useState } from 'react';
import { loginWithCredentials, verifyUser, requestPasswordReset, logout } from '../api/auth';
import { clearCachedCsrfToken } from '../utils/apiHelpers';
import { useSnackbarContext } from './SnackbarContext';
import { useNavigate } from 'react-router-dom';
import LoadingWrapper from './LoadingWrapper';
import { motion } from 'framer-motion';
import { ScanLine, Quote } from 'lucide-react';

import { QBO_AUTH_URI, XERO_AUTH_URI } from '../api/config';
import SEO from './SEO';
import LoginForm from './login/LoginForm';
import SocialLoginButtons from './login/SocialLoginButtons';
import UserSessionIndicator from './login/UserSessionIndicator';
import ForgotPasswordModal from './login/ForgotPasswordModal';
import LoginErrorBoundary from './login/LoginErrorBoundary';
import { useLoginError } from '../hooks/useLoginError';

interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Placeholder Logo Component (for mobile view)
 */
const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 p-2">
      <ScanLine className="h-6 w-6 text-white" />
    </div>
    <span className="text-2xl font-bold tracking-tight text-slate-900">
      Smart Picker
    </span>
  </div>
);


const Login: React.FC = () => {
  // --- All Logic and State Hooks remain identical ---
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

  // --- All useEffect and Handler Functions remain identical ---
  useEffect(() => {
    verifyUser()
      .then((response: any) => {
        if (response.isValid && response.user && response.user.userId) {
          const hasRememberMe = localStorage.getItem('rememberMe') === 'true';
          if (hasRememberMe) {
            navigate('/dashboard');
          } else {
            setCurrentUser({
              email: response.user.email || 'Unknown User',
              name: response.user.name
            });
            setPreFilledEmail(response.user.email || '');
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error verifying user:', error);
        handleLoginError(error);
        setLoading(false);
      });
  }, [navigate, handleLoginError]);

  const handleSwitchAccount = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      clearCachedCsrfToken(); // Clear CSRF token cache
      setShowSwitchAccount(true);
      setCurrentUser(null);
      setPreFilledEmail('');
      localStorage.removeItem('rememberMe');
    }
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
    clearError(); 

    try {
      const user = await loginWithCredentials(data.email, data.password, rememberMe) as any;

      if (user.qboReAuthRequired) {
        handleOpenSnackbar('Your accounting connection has expired. Redirecting to reconnect...', 'warning');
        setTimeout(() => {
          handleQuickBooksLogin();
        }, 3000);
      } else {
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

  // --- JSX Layout is Redesigned ---
  return (
    <LoginErrorBoundary>
      <SEO 
        title="Login - Smart Picker" 
        description="Access your Smart Picker dashboard to manage orders, track inventory, and streamline your warehouse operations."
        canonicalUrl="https://smartpicker.au/login"
      />
      <LoadingWrapper isLoading={loading} height="100vh">
        {/* New Split Screen Layout */}
        <div className="flex min-h-screen bg-white">
          
          {/* 1. Brand Panel (Visible on Desktop only) */}
          <div className="relative hidden w-0 flex-1 flex-col justify-end bg-blue-900 p-12 text-white md:flex lg:w-1/2">
            
            {/* Testimonial */}
            <div className="relative z-10">
              <Quote className="h-16 w-16 text-blue-700" />
              <p className="mt-4 text-3xl font-medium text-white">
                &quot;This tool cut our picking errors to zero and saved us 10 hours a week. A total game-changer for our entire warehouse operation.&quot;
              </p>
              <p className="mt-6 font-semibold text-blue-200">
                — Warehouse Manager, Golden Shore Products
              </p>
            </div>
          </div>

          {/* 2. Form Panel (Full width on Mobile, Half width on Desktop) */}
          <div className="flex w-full flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24">
            <main className="mx-auto w-full max-w-sm lg:w-96">
              
              {/* Logo (Visible on Mobile only) */}
              <div className="md:hidden">
                <Logo />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mt-8"
              >
                {/* User Session Indicator (Unchanged) */}
                {currentUser && !showSwitchAccount && (
                  <UserSessionIndicator
                    currentUser={currentUser}
                    onSwitchAccount={handleSwitchAccount}
                  />
                )}

                {/* Header Text (Redesigned with solid text) */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {showSwitchAccount ? 'Switch Account' : (currentUser ? 'Welcome Back!' : 'Welcome')}
                  </h1>
                  <p className="mt-2 text-lg text-slate-600">
                    {showSwitchAccount 
                      ? 'Sign in with different credentials' 
                      : currentUser 
                        ? 'Enter your password to continue' 
                        : 'Sign in to your account'
                    }
                  </p>
                </div>

                {/* Login Form (Unchanged Child Component) */}
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

                {/* Social Login Buttons (Unchanged Child Component) */}
                <SocialLoginButtons
                  onQuickBooksLogin={handleQuickBooksLogin}
                  onXeroLogin={handleXeroLogin}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            </main>
          </div>
        </div>
      </LoadingWrapper>

      {/* Password Reset Modal (Unchanged) */}
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