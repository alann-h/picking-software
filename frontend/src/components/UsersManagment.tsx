import React, { useState } from 'react';
import { useSnackbarContext } from './SnackbarContext';
import { getAllUsers, registerUser, deleteUser, updateUser, getUserStatus } from '../api/user';
import { useNavigate } from 'react-router-dom';
import { disconnectQB } from '../api/auth';
import { useAdminFunctions } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Power, ShieldAlert, AlertCircle, Info, KeyRound } from 'lucide-react';

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
    const { getCompanyUserPermissions, updateUserPermissions, connectionType } = useAdminFunctions();
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

    // Mutation for disconnecting accounting service
    const disconnectQBMutation = useMutation({
        mutationFn: async () => {
            return await disconnectQB();
        },
        onSuccess: () => {
            navigate('/');
            const serviceName = connectionType === 'xero' ? 'Xero' : 'QuickBooks';
            handleOpenSnackbar(`All ${serviceName} data removed successfully`, 'success');
        },
        onError: (error) => {
            console.error(`Failed to disconnect ${connectionType === 'xero' ? 'Xero' : 'QuickBooks'}:`, error);
            const serviceName = connectionType === 'xero' ? 'Xero' : 'QuickBooks';
            handleOpenSnackbar(`Failed to disconnect from ${serviceName}. Please try again.`, 'error');
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
            <div className="py-8 text-center">
                <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-red-600 mb-2">
                    Access Denied
                </h2>
                <p className="text-gray-600">
                    You do not have permission to access user management. Please contact an administrator.
                </p>
            </div>
        );
    }
    
    return (
        <div className="py-4">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold mb-1">
                        User Management & Permissions
                    </h1>
                    <p className="text-gray-600">
                        Manage users, their roles, and access permissions in one place
                    </p>
                    <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
                        <div className="flex items-center">
                            <Info className="h-5 w-5 text-blue-600 mr-3" />
                            <p className="text-sm text-blue-800">
                                <strong>Current User:</strong> {currentUser?.display_email} ({currentUser?.is_admin ? 'Administrator' : 'User'})
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                            <p className="text-sm text-red-800">
                                Failed to load users. Please refresh the page or try again later.
                            </p>
                        </div>
                    </div>
                )}

                {/* Add User Button */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => setAddDialogOpen(true)}
                        disabled={userList.length >= 5 || addUserMutation.isPending}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" />
                        {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                    </button>
                    
                    {userList.length >= 5 && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md">
                            <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                                <p className="text-sm text-yellow-800">
                                    You have reached the maximum limit of 5 users. To add a new user, please delete an existing one.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Unified User Table */}
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Information</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Status</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Access Level</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <UserTableSkeleton />
                                        </td>
                                    </tr>
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
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Permission Levels Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <KeyRound className="h-5 w-5 mr-2 text-gray-600" />
                        Permission Levels:
                    </h3>
                    <ul className="space-y-2">
                        <li className="flex items-start">
                            <strong className="w-20 font-medium">Read:</strong>
                            <span className="text-gray-600">Can view data but cannot modify</span>
                        </li>
                        <li className="flex items-start">
                            <strong className="w-20 font-medium">Write:</strong>
                            <span className="text-gray-600">Can view and modify data</span>
                        </li>
                        <li className="flex items-start">
                            <strong className="w-20 font-medium">Admin:</strong>
                            <span className="text-gray-600">Full access including user management</span>
                        </li>
                    </ul>
                </div>

                {/* Accounting Service Disconnect */}
                <div className="border border-red-300 bg-red-50 rounded-lg p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-red-800 mb-1 flex items-center">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                {connectionType === 'qbo' ? 'QuickBooks Integration' : 'Xero Integration'}
                            </h3>
                            <p className="text-sm text-red-700">
                                Disconnect from {connectionType === 'qbo' ? 'QuickBooks' : 'Xero'} to remove all associated data
                            </p>
                        </div>
                        <button
                            onClick={() => setDisconnecting(true)}
                            disabled={disconnectQBMutation.isPending}
                            className="inline-flex items-center justify-center rounded-md border border-red-500 bg-transparent px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Power className="mr-2 h-4 w-4" />
                            {disconnectQBMutation.isPending ? 'Disconnecting...' : `Disconnect ${connectionType === 'qbo' ? 'QuickBooks' : 'Xero'}`}
                        </button>
                    </div>
                </div>
            </div>
            
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
                title={`Disconnect from ${connectionType === 'qbo' ? 'QuickBooks' : 'Xero'}?`}
                content={`Are you sure? This will permanently delete all associated ${connectionType === 'qbo' ? 'QuickBooks' : 'Xero'} data from our system. This action cannot be undone.`}
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
        </div>
    );
};

export default UsersManagement;