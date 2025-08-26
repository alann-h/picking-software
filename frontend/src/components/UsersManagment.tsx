import React, { useState } from 'react';
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
} from '@mui/material';
import { 
    Add as AddIcon, 
    PowerOff as PowerOffIcon, 
    Security as SecurityIcon,
} from '@mui/icons-material';
import { useSnackbarContext } from './SnackbarContext';
import { getAllUsers, registerUser, deleteUser, updateUser, getUserStatus } from '../api/user';
import { useNavigate } from 'react-router-dom';
import { disconnectQB } from '../api/auth';
import { useAdminFunctions } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AddUserDialog from './userManagement/AddUserDialog';
import ConfirmationDialog from './userManagement/ConfirmationDialog';
import EditUserDialog from './userManagement/EditUserDialog';
import UserTable from './userManagement/UserTable';
import { UserTableSkeleton } from './Skeletons';
import { ExtendedUserData, PermissionChangeConfirm } from './userManagement/types';

const UsersManagement = () => {
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<ExtendedUserData | null>(null);
    const [userToEdit, setUserToEdit] = useState<ExtendedUserData | null>(null);
    const [isDisconnecting, setDisconnecting] = useState(false);
    const [permissionChangeConfirm, setPermissionChangeConfirm] = useState<PermissionChangeConfirm | null>(null);
    
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
        mutationFn: async (newUserData: Omit<ExtendedUserData, 'id' | 'company_id'>) => {
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
        mutationFn: async ({ userId, data }: { userId: string; data: Partial<ExtendedUserData> }) => {
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

    const handleAddUser = async (newUserData: Omit<ExtendedUserData, 'id' | 'company_id'>) => {
        try {
            await addUserMutation.mutateAsync(newUserData);
            return true;
        } catch (_error) {
            return false;
        }
    };

    const handleUpdateUser = async (userId: string, data: Partial<ExtendedUserData>) => {
        await updateUserMutation.mutateAsync({ userId, data });
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
        } catch (_error) {
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

        try {
            await deleteUserMutation.mutateAsync(userToDelete.id);
        } catch (_error) {
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
        } catch (_error) {
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
                                ) : (
                                    <UserTable
                                        userList={userList}
                                        currentUser={currentUser}
                                        isLoading={isLoading}
                                        updatePermissionsMutation={updatePermissionsMutation}
                                        onEditUser={setUserToEdit}
                                        onDeleteUser={setUserToDelete}
                                        onPermissionUpdate={handlePermissionUpdate}
                                    />
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