import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Stack,
    Alert,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import { 
    Save as SaveIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { UserData } from '../../utils/types';
import { ExtendedUserData } from './types';
import { canEditUser } from './utils';
import { z } from 'zod';

interface EditUserDialogProps {
    open: boolean;
    user: ExtendedUserData | null;
    onClose: () => void;
    onSave: (userId: string, data: Partial<UserData>) => Promise<void>;
    currentUser: ExtendedUserData | null;
}

// Zod validation schemas
const UserUpdateSchema = z.object({
    given_name: z.string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be 50 characters or less')
        .regex(/^[a-zA-Z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
        .optional(),
    family_name: z.string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be 50 characters or less')
        .regex(/^[a-zA-Z\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
        .optional(),
    display_email: z.string()
        .email('Please enter a valid email address')
        .max(255, 'Email address is too long')
        .optional(),
    is_admin: z.boolean().optional(),
});

type UserUpdateData = z.infer<typeof UserUpdateSchema>;

// Zod validation utility function
const validateWithZod = (schema: z.ZodSchema<any>, data: unknown): { isValid: boolean; errors: Record<string, string> } => {
    try {
        schema.parse(data);
        return { isValid: true, errors: {} };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const newErrors: Record<string, string> = {};
            error.issues.forEach((issue: z.core.$ZodIssue) => {
                if (issue.path[0]) {
                    newErrors[issue.path[0] as string] = issue.message;
                }
            });
            return { isValid: false, errors: newErrors };
        }
        return { isValid: false, errors: { general: 'Validation failed' } };
    }
};



const EditUserDialog: React.FC<EditUserDialogProps> = ({ open, user, onClose, onSave, currentUser }) => {
    const [formData, setFormData] = useState<UserUpdateData>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                given_name: user.given_name || '',
                family_name: user.family_name || '',
                display_email: user.display_email || '',
                is_admin: user.is_admin || false,
            });
            setErrors({});
            setHasChanges(false);
        }
    }, [user]);

    const handleChange = (field: keyof UserUpdateData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const validation = validateWithZod(UserUpdateSchema, formData);
        setErrors(validation.errors);
        return validation.isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !currentUser) return;

        // Security check
        if (!canEditUser(user, currentUser)) {
            console.error('Unauthorized attempt to edit user');
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            await onSave(user.id, formData);
            onClose();
        } catch (error) {
            console.error('Failed to update user:', error);
            // Error is handled by the parent component
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            // Could add confirmation dialog here
            console.log('Discarding unsaved changes');
        }
        onClose();
    };

    if (!user || !currentUser) return null;

    // Security check - if user can't edit, don't show dialog
    if (!canEditUser(user, currentUser)) {
        console.error('Unauthorized access attempt to edit user dialog');
        return null;
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6">Edit User: {user.display_email}</Typography>
                </Stack>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Stack spacing={3}>
                        <TextField
                            label="First Name"
                            value={formData.given_name || ''}
                            onChange={(e) => handleChange('given_name', e.target.value)}
                            error={!!errors.given_name}
                            helperText={errors.given_name}
                            fullWidth
                            required
                            inputProps={{
                                maxLength: 50
                            }}
                        />
                        <TextField
                            label="Last Name"
                            value={formData.family_name || ''}
                            onChange={(e) => handleChange('family_name', e.target.value)}
                            error={!!errors.family_name}
                            helperText={errors.family_name}
                            fullWidth
                            required
                            inputProps={{
                                maxLength: 50
                            }}
                        />
                        <TextField
                            label="Email"
                            type="email"
                            value={formData.display_email || ''}
                            onChange={(e) => handleChange('display_email', e.target.value)}
                            error={!!errors.display_email}
                            helperText={errors.display_email}
                            fullWidth
                            required
                            inputProps={{
                                maxLength: 255
                            }}
                        />
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Admin privileges allow full system access including user management
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Checkbox
                                    checked={formData.is_admin || false}
                                    onChange={(e) => handleChange('is_admin', e.target.checked)}
                                    color="primary"
                                />
                                <Typography component="span" variant="body2">
                                    Grant admin privileges
                                </Typography>
                            </Box>
                            {formData.is_admin && (
                                <Alert severity="warning" sx={{ mt: 1 }}>
                                    <Typography variant="caption">
                                        <strong>Warning:</strong> Admin users have full access to the system, including the ability to manage other users and access all data.
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        disabled={isLoading || !hasChanges}
                        startIcon={<SaveIcon />}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default EditUserDialog;
