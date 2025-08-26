import React, { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Stack,
    Alert,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    FormControl,
    MenuItem,
    Select,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import { 
    Add as AddIcon, 
    PowerOff as PowerOffIcon, 
    Edit as EditIcon,
    Save as SaveIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    Security as SecurityIcon,
} from '@mui/icons-material';
import { useSnackbarContext } from './SnackbarContext';
import { getAllUsers, registerUser, deleteUser, updateUser, getUserStatus } from '../api/user';
import { UserData } from '../utils/types';
import { useNavigate } from 'react-router-dom';
import { disconnectQB } from '../api/auth';
import { useAdminFunctions } from '../hooks/useAuth';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AddUserDialog from './userManagement/AddUserDialog';
import ConfirmationDialog from './userManagement/ConfirmationDialog';
import { UserTableSkeleton } from './Skeletons';



interface ExtendedUserData extends UserData {
    can_access_qbo?: boolean;
    can_access_xero?: boolean;
    can_refresh_tokens?: boolean;
    access_level?: string;
}

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

// Schema for new user creation (includes password)
const NewUserSchema = z.object({
    given_name: z.string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be 50 characters or less')
        .regex(/^[a-zA-Z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
    family_name: z.string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be 50 characters or less')
        .regex(/^[a-zA-Z\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
    display_email: z.string()
        .email('Please enter a valid email address')
        .max(255, 'Email address is too long'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password is too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    is_admin: z.boolean().default(false),
});

// Schema for permission updates
const PermissionUpdateSchema = z.object({
    can_access_qbo: z.boolean().optional(),
    can_access_xero: z.boolean().optional(),
    can_refresh_tokens: z.boolean().optional(),
    access_level: z.enum(['read', 'write', 'admin']).optional(),
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

// Security and permission utilities
const canEditUser = (targetUser: ExtendedUserData, currentUser: ExtendedUserData | null): boolean => {
    if (!currentUser) return false;
    if (!currentUser.is_admin) return false;
    if (targetUser.id === currentUser.id) return false; // Can't edit yourself
    return true;
};

const canDeleteUser = (targetUser: ExtendedUserData, currentUser: ExtendedUserData | null): boolean => {
    if (!currentUser) return false;
    if (!currentUser.is_admin) return false;
    if (targetUser.id === currentUser.id) return false; // Can't delete yourself
    return true;
};

const canChangePermissions = (targetUser: ExtendedUserData, currentUser: ExtendedUserData | null): boolean => {
    if (!currentUser) return false;
    if (!currentUser.is_admin) return false;
    if (targetUser.id === currentUser.id) return false; // Can't change own permissions
    return true;
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

const UsersManagement = () => {
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<ExtendedUserData | null>(null);
    const [userToEdit, setUserToEdit] = useState<ExtendedUserData | null>(null);
    const [isDisconnecting, setDisconnecting] = useState(false);
    const [permissionChangeConfirm, setPermissionChangeConfirm] = useState<{
        userId: string;
        field: string;
        value: any;
        user: ExtendedUserData;
    } | null>(null);
    
    const navigate = useNavigate();
    const { handleOpenSnackbar } = useSnackbarContext();
    const { getCompanyUserPermissions, updateUserPermissions } = useAdminFunctions();
    const queryClient = useQueryClient();

    // Query for fetching users with permissions
    const { data: usersData, isLoading, error } = useQuery({
        queryKey: ['users', 'permissions'],
        queryFn: async () => {
            const [basicUsers, userPermissions, userStatus] = await Promise.all([
                getAllUsers(),
                getCompanyUserPermissions(),
                getUserStatus()
            ]);

            // Merge user data with permissions
            const mergedUsers = basicUsers.map((user: any) => {
                const permissions = userPermissions.find((p: any) => p.id === user.id);
                return {
                    ...user,
                    can_access_qbo: permissions?.can_access_qbo || false,
                    can_access_xero: permissions?.can_access_xero || false,
                    can_refresh_tokens: permissions?.can_refresh_tokens || false,
                    access_level: permissions?.access_level || 'read',
                };
            });

            return { users: mergedUsers, currentUserId: userStatus.userId };
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    // Extract users and current user from query data
    const userList = usersData?.users || [];
    const currentUser = userList.find((u: ExtendedUserData) => u.id === usersData?.currentUserId) || null;

    // Mutation for adding a new user
    const addUserMutation = useMutation({
        mutationFn: async (newUserData: Omit<UserData, 'id' | 'company_id'>) => {
            return await registerUser(
                newUserData.display_email,
                newUserData.given_name,
                newUserData.family_name,
                newUserData.password!,
                newUserData.is_admin
            );
        },
        onSuccess: () => {
            handleOpenSnackbar('User added successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['users', 'permissions'] });
        },
        onError: (error) => {
            console.error('Failed to add user:', error);
            handleOpenSnackbar('Failed to add user. Please try again.', 'error');
        },
    });

    // Mutation for updating user information
    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserData> }) => {
            return await updateUser(userId, data);
        },
        onSuccess: () => {
            handleOpenSnackbar('User updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['users', 'permissions'] });
        },
        onError: (error) => {
            console.error('Failed to update user:', error);
            handleOpenSnackbar('Failed to update user. Please try again.', 'error');
        },
    });

    const handleAddUser = async (newUserData: Omit<UserData, 'id' | 'company_id'>) => {
        try {
            await addUserMutation.mutateAsync(newUserData);
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleUpdateUser = async (userId: string, data: Partial<UserData>) => {
        // Security check
        if (!currentUser || !canEditUser(userList.find((u: ExtendedUserData) => u.id === userId)!, currentUser)) {
            handleOpenSnackbar('You do not have permission to edit this user.', 'error');
            return;
        }

        try {
            await updateUserMutation.mutateAsync({ userId, data });
        } catch (error) {
            throw error;
        }
    };

    // Mutation for updating user permissions
    const updatePermissionsMutation = useMutation({
        mutationFn: async ({ userId, field, value }: { userId: string; field: string; value: any }) => {
            const currentUserData = userList.find((u: ExtendedUserData) => u.id === userId);
            if (!currentUserData) throw new Error('User not found');

            const updatedPermissions = {
                canAccessQBO: field === 'can_access_qbo' ? value : currentUserData.can_access_qbo,
                canAccessXero: field === 'can_access_xero' ? value : currentUserData.can_access_xero,
                canRefreshTokens: field === 'can_refresh_tokens' ? value : currentUserData.can_refresh_tokens,
                accessLevel: field === 'access_level' ? value : currentUserData.access_level,
            };

            return await updateUserPermissions(userId, updatedPermissions);
        },
        onSuccess: () => {
            handleOpenSnackbar('Permissions updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['users', 'permissions'] });
        },
        onError: (error) => {
            console.error('Failed to update permissions:', error);
            handleOpenSnackbar('Failed to update permissions. Please try again.', 'error');
        },
    });

    const handlePermissionUpdate = async (userId: string, field: string, value: any) => {
        const targetUser = userList.find((u: ExtendedUserData) => u.id === userId);
        if (!targetUser || !currentUser) return;

        // Security check
        if (!canChangePermissions(targetUser, currentUser)) {
            handleOpenSnackbar('You do not have permission to change permissions for this user.', 'error');
            return;
        }

        // For sensitive permission changes, show confirmation
        if (field === 'access_level' && value === 'admin') {
            setPermissionChangeConfirm({ userId, field, value, user: targetUser });
            return;
        }

        await performPermissionUpdate(userId, field, value);
    };

    const performPermissionUpdate = async (userId: string, field: string, value: any) => {
        try {
            await updatePermissionsMutation.mutateAsync({ userId, field, value });
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    // Mutation for deleting a user
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await deleteUser(userId);
        },
        onSuccess: async (_, userId) => {
            try {
                const userStatus = await getUserStatus();
                if (userStatus.userId === userId) {
                    navigate('/login');
                    handleOpenSnackbar('User deleted successfully. You have been logged out.', 'success');
                } else {
                    handleOpenSnackbar('User deleted successfully', 'success');
                    queryClient.invalidateQueries({ queryKey: ['users', 'permissions'] });
                }
            } catch (error) {
                console.error('Failed to get user status:', error);
            }
        },
        onError: (error) => {
            console.error('Failed to delete user:', error);
            handleOpenSnackbar('Failed to delete user. Please try again.', 'error');
        },
    });

    const handleDeleteUser = async () => {
        if (!userToDelete || !currentUser) return;

        // Security check
        if (!canDeleteUser(userToDelete, currentUser)) {
            handleOpenSnackbar('You do not have permission to delete this user.', 'error');
            setUserToDelete(null);
            return;
        }

        try {
            await deleteUserMutation.mutateAsync(userToDelete.id);
        } catch (error) {
            // Error is handled by the mutation
        } finally {
            setUserToDelete(null);
        }
    };

    // Mutation for disconnecting QuickBooks
    const disconnectQBMutation = useMutation({
        mutationFn: async () => {
            return await disconnectQB();
        },
        onSuccess: () => {
            navigate('/');
            handleOpenSnackbar('All QuickBooks data removed successfully', 'success');
        },
        onError: (error) => {
            console.error('Failed to disconnect QuickBooks:', error);
            handleOpenSnackbar('Failed to disconnect from QuickBooks. Please try again.', 'error');
        },
    });

    const handleQbDisconnect = async () => {
        try {
            await disconnectQBMutation.mutateAsync();
        } catch (error) {
            // Error is handled by the mutation
        } finally {
            setDisconnecting(false);
        }
    };

    // Security check for current user
    if (!currentUser?.is_admin) {
        return (
            <Box sx={{ py: 4, textAlign: 'center' }}>
                <SecurityIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                <Typography variant="h4" color="error.main" gutterBottom>
                    Access Denied
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    You do not have permission to access user management. Please contact an administrator.
                </Typography>
            </Box>
        );
    }
    
    return (
        <Box sx={{ py: 2 }}>
            <Stack spacing={3}>
                {/* Header */}
                <Box>
                    <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 1 }}>
                        User Management & Permissions
                    </Typography>
                    <Typography color="text.secondary">
                        Manage users, their roles, and access permissions in one place
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <strong>Current User:</strong> {currentUser?.display_email} ({currentUser?.is_admin ? 'Administrator' : 'User'})
                        </Typography>
                    </Alert>
                </Box>

                {/* Error Display */}
                {error && (
                    <Alert severity="error" sx={{ borderRadius: 1 }}>
                        <Typography variant="body2">
                            Failed to load users. Please refresh the page or try again later.
                        </Typography>
                    </Alert>
                )}

                {/* Add User Button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                        variant="contained"
                        onClick={() => setAddDialogOpen(true)}
                        disabled={userList.length >= 5 || addUserMutation.isPending}
                        startIcon={<AddIcon />}
                        size="medium"
                    >
                        {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                    </Button>
                    
                    {userList.length >= 5 && (
                        <Alert severity="warning" sx={{ borderRadius: 1 }}>
                            You have reached the maximum limit of 5 users. To add a new user, please delete an existing one.
                        </Alert>
                    )}
                </Box>

                {/* Unified User Table */}
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>User Information</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Admin Status</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>QBO Access</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Xero Access</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Token Refresh</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Access Level</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7}>
                                            <UserTableSkeleton />
                                        </TableCell>
                                    </TableRow>
                                ) : userList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Typography color="text.secondary">No users found</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    userList.map((user: ExtendedUserData) => {
                                        const canEdit = canEditUser(user, currentUser);
                                        const canDelete = canDeleteUser(user, currentUser);
                                        const canChangePerms = canChangePermissions(user, currentUser);
                                        
                                        return (
                                            <TableRow key={user.id} hover>
                                                {/* User Information */}
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body1" fontWeight="medium">
                                                            {user.display_email}
                                                        </Typography>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {user.given_name} {user.family_name}
                                                            </Typography>
                                                            {user.id === currentUser?.id && (
                                                                <Chip label="You" size="small" color="info" />
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </TableCell>

                                                {/* Admin Status */}
                                                <TableCell align="center">
                                                    <Chip 
                                                        label={user.is_admin ? "Admin" : "User"} 
                                                        size="small" 
                                                        color={user.is_admin ? "primary" : "default"}
                                                    />
                                                </TableCell>

                                                {/* QBO Access */}
                                                <TableCell align="center">
                                                    <Checkbox
                                                        checked={user.can_access_qbo || false}
                                                        onChange={(e) => handlePermissionUpdate(user.id, 'can_access_qbo', e.target.checked)}
                                                        color="primary"
                                                        disabled={!canChangePerms || updatePermissionsMutation.isPending}
                                                    />
                                                </TableCell>

                                                {/* Xero Access */}
                                                <TableCell align="center">
                                                    <Checkbox
                                                        checked={user.can_access_xero || false}
                                                        onChange={(e) => handlePermissionUpdate(user.id, 'can_access_xero', e.target.checked)}
                                                        color="primary"
                                                        disabled={!canChangePerms || updatePermissionsMutation.isPending}
                                                    />
                                                </TableCell>

                                                {/* Token Refresh */}
                                                <TableCell align="center">
                                                    <Checkbox
                                                        checked={user.can_refresh_tokens || false}
                                                        onChange={(e) => handlePermissionUpdate(user.id, 'can_refresh_tokens', e.target.checked)}
                                                        color="primary"
                                                        disabled={!canChangePerms || updatePermissionsMutation.isPending}
                                                    />
                                                </TableCell>

                                                {/* Access Level */}
                                                <TableCell align="center">
                                                    <FormControl size="small">
                                                        <Select
                                                            value={user.access_level || 'read'}
                                                            onChange={(e) => handlePermissionUpdate(user.id, 'access_level', e.target.value)}
                                                            displayEmpty
                                                            disabled={!canChangePerms || updatePermissionsMutation.isPending}
                                                        >
                                                            <MenuItem value="read">Read</MenuItem>
                                                            <MenuItem value="write">Write</MenuItem>
                                                            <MenuItem value="admin">
                                                                Admin
                                                            </MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        {canEdit && (
                                                            <Tooltip title="Edit user information">
                                                                <IconButton
                                                                    color="primary"
                                                                    size="small"
                                                                    onClick={() => setUserToEdit(user)}
                                                                    disabled={updateUserMutation.isPending}
                                                                >
                                                                    <EditIcon />
                                                                </IconButton>
                                                            </Tooltip>
                        )}
                                                        {canDelete && (
                                                            <Tooltip title="Delete user">
                                                                <IconButton
                                                                    color="error"
                                                                    size="small"
                                                                    onClick={() => setUserToDelete(user)}
                                                                    disabled={deleteUserMutation.isPending}
                                                                >
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {!canEdit && !canDelete && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                No actions available
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* Permission Levels Info */}
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom>
                        Permission Levels:
                    </Typography>
                    <Box component="ul" pl={2}>
                        <Typography component="li" variant="body2" mb={1}>
                            <strong>Read:</strong> Can view data but cannot modify
                        </Typography>
                        <Typography component="li" variant="body2" mb={1}>
                            <strong>Write:</strong> Can view and modify data
                        </Typography>
                        <Typography component="li" variant="body2">
                            <strong>Admin:</strong> Full access including user management
                        </Typography>
                    </Box>
                </Paper>

                {/* QuickBooks Disconnect */}
                <Paper 
                    elevation={0}
                    sx={{ 
                        border: '1px solid',
                        borderColor: 'error.light',
                        borderRadius: 2,
                        bgcolor: 'error.50',
                        p: 3
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6" fontWeight={600} color="error.main" sx={{ mb: 1 }}>
                                QuickBooks Integration
                            </Typography>
                            <Typography variant="body2" color="error.dark">
                                Disconnect from QuickBooks to remove all associated data
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<PowerOffIcon />}
                            onClick={() => setDisconnecting(true)}
                            disabled={disconnectQBMutation.isPending}
                            size="medium"
                        >
                            {disconnectQBMutation.isPending ? 'Disconnecting...' : 'Disconnect QuickBooks'}
                        </Button>
                    </Stack>
                </Paper>
            </Stack>
            
            {/* Dialogs */}
            <AddUserDialog
                open={isAddDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onAddUser={handleAddUser}
            />

            <EditUserDialog
                open={!!userToEdit}
                user={userToEdit}
                onClose={() => setUserToEdit(null)}
                onSave={handleUpdateUser}
                currentUser={currentUser}
            />

            <ConfirmationDialog
                open={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleDeleteUser}
                confirmColor="error"
                title="Delete User?"
                content={`Are you sure you want to delete the user "${userToDelete?.given_name}"? This action cannot be undone and will remove all associated data.`}
                confirmText={deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            />
            
            <ConfirmationDialog
                open={isDisconnecting}
                onClose={() => setDisconnecting(false)}
                onConfirm={handleQbDisconnect}
                title="Disconnect from QuickBooks?"
                content="Are you sure? This will permanently delete all associated QuickBooks data from our system. This action cannot be undone."
                confirmColor="error"
                confirmText={disconnectQBMutation.isPending ? "Disconnecting..." : "Disconnect"}
            />

            {/* Permission Change Confirmation */}
            <ConfirmationDialog
                open={!!permissionChangeConfirm}
                onClose={() => setPermissionChangeConfirm(null)}
                onConfirm={() => {
                    if (permissionChangeConfirm) {
                        performPermissionUpdate(
                            permissionChangeConfirm.userId,
                            permissionChangeConfirm.field,
                            permissionChangeConfirm.value
                        );
                        setPermissionChangeConfirm(null);
                    }
                }}
                title="Grant Admin Access?"
                content={`Are you sure you want to grant admin access to "${permissionChangeConfirm?.user.given_name}"? This user will have full system access including the ability to manage other users.`}
                confirmColor="warning"
                confirmText={updatePermissionsMutation.isPending ? "Granting..." : "Grant Admin Access"}
            />
        </Box>
    );
};

export default UsersManagement;