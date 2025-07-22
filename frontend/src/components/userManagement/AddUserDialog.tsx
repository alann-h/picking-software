// AddUserDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Switch, Typography, Stack } from '@mui/material';
import { z } from 'zod';

const userSchema = z.object({
  given_name: z.string().min(1, "First name is required."),
  family_name: z.string(),
  display_email: z.string().email("Please enter a valid email address."),
  password: z.string()
    .min(8, "Password must be at least 8 characters long.")
    .refine(data => /[A-Z]/.test(data), "Needs an uppercase letter.")
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

    const handleClose = () => {
        onClose();
        setNewUser(DEFAULT_USER);
        setErrors({});
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

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle fontWeight="bold">Add New User</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <Stack direction="row" spacing={2}>
                        <TextField label="First Name" fullWidth value={newUser.given_name} onChange={e => handleChange('given_name', e.target.value)} error={!!errors.given_name} helperText={errors.given_name} required />
                        <TextField label="Last Name" fullWidth value={newUser.family_name} onChange={e => handleChange('family_name', e.target.value)} error={!!errors.family_name} helperText={errors.family_name} />
                    </Stack>
                    <TextField label="Email" type="email" fullWidth value={newUser.display_email} onChange={e => handleChange('display_email', e.target.value)} error={!!errors.display_email} helperText={errors.display_email} required />
                    <TextField label="Password" type="password" fullWidth value={newUser.password} onChange={e => handleChange('password', e.target.value)} error={!!errors.password} helperText={errors.password} required />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
                        <Typography>Admin Access</Typography>
                        <Switch checked={newUser.is_admin} onChange={e => handleChange('is_admin', e.target.checked)} />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={handleClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add User'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
export default AddUserDialog;