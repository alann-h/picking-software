import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
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
        <div className="flex min-h-screen items-center bg-gradient-to-br from-blue-700 via-blue-500 to-blue-400 py-4">
          <div className="container mx-auto max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="rounded-2xl border border-white/20 bg-black/30 p-6 shadow-2xl backdrop-blur-sm">
                <div className="mb-3 text-center">
                  <h1 className="mb-2 bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-2xl font-bold text-transparent">
                    Invalid Reset Link
                  </h1>
                </div>
                
                <div className="mb-3 rounded-md bg-red-900/50 p-3 text-center text-red-300">
                  {tokenError}
                </div>
                
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-blue-800 to-blue-500 py-3 text-white transition hover:from-blue-500 hover:to-blue-800"
                >
                  Back to Login
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </LoadingWrapper>
    );
  }

  return (
    <LoadingWrapper isLoading={false}>
      <SEO 
        title="Reset Password - Smart Picker" 
        description="Reset your Smart Picker password"
        canonicalUrl="https://smartpicker.au/reset-password"
      />
      <div className="flex min-h-screen items-center bg-gradient-to-r from-indigo-500 to-purple-600 py-4">
        <div className="container mx-auto max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="rounded-2xl border border-white/20 bg-black/30 p-6 shadow-2xl backdrop-blur-sm">
              <div className="mb-4 text-center">
                <h1 className="mb-1 bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-3xl font-bold text-transparent">
                  Reset Password
                </h1>
                <p className="text-lg text-gray-300">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New Password"
                      disabled={isSubmitting}
                      className={`w-full rounded-lg border bg-transparent py-2 pl-10 pr-10 text-white placeholder-gray-400 ${errors.password ? 'border-red-500' : 'border-gray-600'} focus:border-blue-400 focus:ring-blue-400`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      {...register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm New Password"
                      disabled={isSubmitting}
                      className={`w-full rounded-lg border bg-transparent py-2 pl-10 pr-10 text-white placeholder-gray-400 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-600'} focus:border-blue-400 focus:ring-blue-400`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isSubmitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={!isValid || isSubmitting || !passwordValue || !confirmPasswordValue}
                    className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-blue-800 to-blue-500 py-3 text-lg font-semibold text-white transition hover:from-blue-500 hover:to-blue-800 disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    disabled={isSubmitting}
                    className="w-full cursor-pointer text-center text-gray-300"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </LoadingWrapper>
  );
};

export default ResetPassword;
