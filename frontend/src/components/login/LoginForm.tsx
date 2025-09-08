import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isSubmitting: boolean;
  rememberMe: boolean;
  onRememberMeChange: (checked: boolean) => void;
  onForgotPassword: () => void;
  preFilledEmail?: string;
  showSwitchAccount?: boolean;
  error?: { message: string; code?: string; field?: string } | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isSubmitting,
  rememberMe,
  onRememberMeChange,
  onForgotPassword,
  preFilledEmail = '',
  showSwitchAccount = false,
  error,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: preFilledEmail,
      password: '',
    },
  });

  React.useEffect(() => {
    if (preFilledEmail) {
      setValue('email', preFilledEmail);
    }
  }, [preFilledEmail, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-6">
        {/* Global Error Display */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-600 bg-red-100 p-4">
            <AlertCircle
              className="h-5 w-5 flex-shrink-0 text-red-700"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-red-800">
              {error.message}
            </p>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Email Address
          </label>
          <div className="relative mt-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              autoFocus={!preFilledEmail}
              disabled={isSubmitting}
              className={`block w-full rounded-lg border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                errors.email
                  ? 'ring-red-500 focus:ring-red-500'
                  : 'ring-gray-300 focus:ring-blue-600'
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Password
          </label>
          <div className="relative mt-2">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              className={`block w-full rounded-lg border-0 py-2.5 pr-10 text-gray-900 ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                errors.password
                  ? 'ring-red-500 focus:ring-red-500'
                  : 'ring-gray-300 focus:ring-blue-600'
              }`}
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

        {/* Options Row: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-700"
            >
              Remember me
            </label>
          </div>
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={isSubmitting}
            className="text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-600 hover:to-blue-400 hover:shadow-md hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:transform-none disabled:shadow-none cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing In...
            </>
          ) : showSwitchAccount ? (
            'Switch Account'
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
