import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPassword } from '../api/auth';
import { useSnackbarContext } from './SnackbarContext';
import SEO from './SEO';

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
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reset password. Please try again.';
      handleOpenSnackbar(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  if (tokenError) {
    return (
      <>
        <SEO 
          title="Reset Password - Smart Picker" 
          description="Reset your Smart Picker password"
          canonicalUrl="https://smartpicker.com.au/reset-password"
        />
        <div className="flex min-h-screen bg-white">
          <div className="flex w-full flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
            <main className="mx-auto w-full max-w-sm lg:w-96">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mt-8"
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Invalid Reset Link
                  </h1>
                  <p className="mt-2 text-lg text-slate-600">
                    This password reset link is invalid or has expired
                  </p>
                </div>

                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-600 bg-red-50 p-4">
                  <AlertCircle
                    className="h-5 w-5 flex-shrink-0 text-red-700"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-red-800">
                    {tokenError}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-600 hover:to-blue-400 hover:shadow-md hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
                >
                  Back to Login
                </button>
              </motion.div>
            </main>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Reset Password - Smart Picker" 
        description="Reset your Smart Picker password"
        canonicalUrl="https://smartpicker.com.au/reset-password"
      />
      <div className="flex min-h-screen bg-white">
        <div className="flex w-full flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
          <main className="mx-auto w-full max-w-sm lg:w-96">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-8"
            >
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Reset Password
                </h1>
                <p className="mt-2 text-lg text-slate-600">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-6">
                  {/* Password Input */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      New Password
                    </label>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        {...register('password')}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        autoFocus
                        disabled={isSubmitting}
                        className={`block w-full rounded-lg border-0 py-2.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                          errors.password
                            ? 'ring-red-500 focus:ring-red-500'
                            : 'ring-gray-300 focus:ring-blue-600'
                        }`}
                        placeholder="Enter your new password"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSubmitting}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        >
                          <span className="sr-only">
                            {showPassword ? 'Hide password' : 'Show password'}
                          </span>
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium leading-6 text-gray-900"
                    >
                      Confirm New Password
                    </label>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        {...register('confirmPassword')}
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        className={`block w-full rounded-lg border-0 py-2.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                          errors.confirmPassword
                            ? 'ring-red-500 focus:ring-red-500'
                            : 'ring-gray-300 focus:ring-blue-600'
                        }`}
                        placeholder="Confirm your new password"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isSubmitting}
                          className="text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                        >
                          <span className="sr-only">
                            {showConfirmPassword ? 'Hide password' : 'Show password'}
                          </span>
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!isValid || isSubmitting || !passwordValue || !confirmPasswordValue}
                    className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-600 hover:to-blue-400 hover:shadow-md hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:bg-none disabled:text-gray-500 disabled:transform-none disabled:shadow-none cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>

                  {/* Back to Login Link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      disabled={isSubmitting}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
