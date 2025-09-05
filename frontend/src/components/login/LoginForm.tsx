import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Button, 
  TextField, 
  Box, 
  Stack,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  Typography
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email 
} from '@mui/icons-material';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
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
  error
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: preFilledEmail,
      password: ''
    }
  });

  // Update form when preFilledEmail changes
  React.useEffect(() => {
    if (preFilledEmail) {
      setValue('email', preFilledEmail);
    }
  }, [preFilledEmail, setValue]);

  const emailValue = watch('email');
  const passwordValue = watch('password');

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={3}>
        {/* Global Error Display */}
        {error && (
          <Box sx={{
            p: 2,
            backgroundColor: 'error.light',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'error.main'
          }}>
            <Typography variant="body2" color="error.dark" sx={{ fontWeight: 500 }}>
              {error.message}
            </Typography>
          </Box>
        )}
        <TextField
          {...register('email')}
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus={!preFilledEmail}
          error={!!errors.email}
          helperText={errors.email?.message}
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
        
        <TextField
          {...register('password')}
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          disabled={isSubmitting}
          slotProps={{
            input: {
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

        {/* Forgot Password Link */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button
            variant="text"
            size="small"
            onClick={onForgotPassword}
            disabled={isSubmitting}
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
              onChange={(e) => onRememberMeChange(e.target.checked)}
              disabled={isSubmitting}
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
          disabled={!isValid || isSubmitting}
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
  );
};

export default LoginForm;
