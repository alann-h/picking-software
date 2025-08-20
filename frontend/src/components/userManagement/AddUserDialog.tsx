// AddUserDialog.tsx
import React, { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Box, 
  Switch, 
  Typography, 
  Stack,
  LinearProgress,
  Chip,
  IconButton,
  InputAdornment,
  Alert
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  CheckCircle, 
  Cancel,
  Security,
  Person,
  Email,
  AdminPanelSettings
} from '@mui/icons-material';
import { z } from 'zod';

const userSchema = z.object({
  given_name: z.string().min(1, "First name is required."),
  family_name: z.string().min(1, "Last name is required."),
  display_email: z.email("Please enter a valid email address."),
  password: z.string()
    .min(8, "Password must be at least 8 characters long.")
    .refine(data => /[A-Z]/.test(data), "Needs an uppercase letter.")
    .refine(data => /[a-z]/.test(data), "Needs a lowercase letter.")
    .refine(data => /[0-9]/.test(data), "Needs a number.")
    .refine(data => /[^A-Za-z0-9]/.test(data), "Needs a symbol."),
  is_admin: z.boolean(),
});

type NewUser = z.infer<typeof userSchema>;
type FormErrors = Partial<Record<keyof NewUser, string>>;

const DEFAULT_USER: NewUser = {
  given_name: '',
  family_name: '',
  display_email: '',
  password: '',
  is_admin: false,
};

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onAddUser: (user: NewUser) => Promise<boolean>;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose, onAddUser }) => {
    const [newUser, setNewUser] = useState<NewUser>(DEFAULT_USER);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleClose = () => {
        onClose();
        setNewUser(DEFAULT_USER);
        setErrors({});
        setShowPassword(false);
    };

    const handleChange = (field: keyof NewUser, value: string | boolean) => {
        setNewUser(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async () => {
        const result = userSchema.safeParse(newUser);
        if (!result.success) {
            const newErrors: FormErrors = {};
            result.error.issues.forEach(err => {
                newErrors[err.path[0] as keyof NewUser] = err.message;
            });
            setErrors(newErrors);
            return;
        }
        
        setSubmitting(true);
        const success = await onAddUser(result.data);
        setSubmitting(false);

        if (success) {
            handleClose();
        }
    };

    // Password strength calculation
    const passwordStrength = useMemo(() => {
        const password = newUser.password;
        if (!password) return { score: 0, color: 'default', label: 'Enter a password' };
        
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            symbol: /[^A-Za-z0-9]/.test(password)
        };

        score = Object.values(checks).filter(Boolean).length;
        
        if (score <= 2) return { score, color: 'error', label: 'Weak' };
        if (score <= 3) return { score, color: 'warning', label: 'Fair' };
        if (score <= 4) return { score, color: 'info', label: 'Good' };
        return { score, color: 'success', label: 'Strong' };
    }, [newUser.password]);

    // Password requirements checklist
    const passwordRequirements = [
        { key: 'length', label: 'At least 8 characters', met: newUser.password.length >= 8 },
        { key: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(newUser.password) },
        { key: 'lowercase', label: 'One lowercase letter', met: /[a-z]/.test(newUser.password) },
        { key: 'number', label: 'One number', met: /[0-9]/.test(newUser.password) },
        { key: 'symbol', label: 'One symbol', met: /[^A-Za-z0-9]/.test(newUser.password) }
    ];

    return (
        <Dialog 
            open={open} 
            onClose={handleClose} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(59,130,246,0.1)'
                }
            }}
        >
            <DialogTitle sx={{ 
                pb: 1, 
                background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                color: 'white',
                borderRadius: '12px 12px 0 0'
            }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Person sx={{ fontSize: 28 }} />
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            Add New User
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Create a new user account for your organization
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            
            <DialogContent sx={{ p: 4 }}>
                <Stack spacing={3}>
                    {/* Basic Information Section */}
                    <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person sx={{ fontSize: 20, color: '#1E40AF' }} />
                            Basic Information
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField 
                                label="First Name" 
                                fullWidth 
                                value={newUser.given_name} 
                                onChange={e => handleChange('given_name', e.target.value)} 
                                error={!!errors.given_name} 
                                helperText={errors.given_name} 
                                required
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person sx={{ color: 'text.secondary', fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                            <TextField 
                                label="Last Name" 
                                fullWidth 
                                value={newUser.family_name} 
                                onChange={e => handleChange('family_name', e.target.value)} 
                                error={!!errors.family_name} 
                                helperText={errors.family_name} 
                                required
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Person sx={{ color: 'text.secondary', fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        </Stack>
                    </Box>

                    {/* Contact Information Section */}
                    <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email sx={{ fontSize: 20, color: '#1E40AF' }} />
                            Contact Information
                        </Typography>
                        <TextField 
                            label="Email Address" 
                            type="email" 
                            fullWidth 
                            value={newUser.display_email} 
                            onChange={e => handleChange('display_email', e.target.value)} 
                            error={!!errors.display_email} 
                            helperText={errors.display_email} 
                            required
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Email sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    </Box>

                    {/* Password Section */}
                    <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Security sx={{ fontSize: 20, color: '#1E40AF' }} />
                            Password Security
                        </Typography>
                        
                        <TextField 
                            label="Password" 
                            type={showPassword ? 'text' : 'password'} 
                            fullWidth 
                            value={newUser.password} 
                            onChange={e => handleChange('password', e.target.value)} 
                            error={!!errors.password} 
                            helperText={errors.password} 
                            required
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Security sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
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
                        {/* Password Strength Indicator */}
                        {newUser.password && (
                            <Box sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Password Strength
                                    </Typography>
                                    <Chip 
                                        label={passwordStrength.label} 
                                        color={passwordStrength.color as any}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={(passwordStrength.score / 5) * 100} 
                                    color={passwordStrength.color as any}
                                    sx={{ height: 6, borderRadius: 3 }}
                                />
                            </Box>
                        )}

                        {/* Password Requirements */}
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Password Requirements:
                            </Typography>
                            <Stack spacing={0.5}>
                                {passwordRequirements.map((req) => (
                                    <Box key={req.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {req.met ? (
                                            <CheckCircle sx={{ color: 'success.main', fontSize: 16 }} />
                                        ) : (
                                            <Cancel sx={{ color: 'error.main', fontSize: 16 }} />
                                        )}
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: req.met ? 'success.main' : 'text.secondary',
                                                textDecoration: req.met ? 'line-through' : 'none'
                                            }}
                                        >
                                            {req.label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    </Box>

                    {/* Admin Access Section */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'grey.50',
                        border: '1px solid rgba(59,130,246,0.1)'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AdminPanelSettings sx={{ color: '#1E40AF', fontSize: 20 }} />
                            <Box>
                                <Typography variant="body1" fontWeight="medium">
                                    Admin Access
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Grant administrative privileges to this user
                                </Typography>
                            </Box>
                        </Box>
                        <Switch 
                            checked={newUser.is_admin} 
                            onChange={e => handleChange('is_admin', e.target.checked)}
                            color="primary"
                        />
                    </Box>

                    {/* Warning for Admin Users */}
                    {newUser.is_admin && (
                        <Alert severity="warning" sx={{ borderRadius: 2 }}>
                            <Typography variant="body2">
                                <strong>Warning:</strong> Admin users have full access to all system features, 
                                including user management and company settings. Only grant admin access to trusted users.
                            </Typography>
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            
            <DialogActions sx={{ p: '20px 24px', gap: 2 }}>
                <Button 
                    onClick={handleClose}
                    variant="outlined"
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    Cancel
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    sx={{ 
                        borderRadius: 2, 
                        px: 3,
                        background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                        }
                    }}
                    startIcon={isSubmitting ? undefined : <Person />}
                >
                    {isSubmitting ? 'Adding User...' : 'Add User'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddUserDialog;