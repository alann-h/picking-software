import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Stack,
    Alert,
    Tabs,
    Tab,
    Paper,
} from '@mui/material';
import { Add as AddIcon, PowerOff as PowerOffIcon, Security as SecurityIcon } from '@mui/icons-material';
import { useSnackbarContext } from './SnackbarContext';
import { getAllUsers, registerUser, deleteUser, updateUser, getUserStatus } from '../api/user';
import { UserData } from '../utils/types';
import { useNavigate } from 'react-router-dom';
import { disconnectQB } from '../api/auth';
import UserPermissionsManager from './UserPermissionsManager';

// Import the new components
import UserTable from './userManagement/UserTable';
import AddUserDialog from './userManagement/AddUserDialog';
import ConfirmationDialog from './userManagement/ConfirmationDialog';
import { UserTableSkeleton } from './Skeletons';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => (
    <div
        role="tabpanel"
        hidden={value !== index}
        id={`user-management-tabpanel-${index}`}
        aria-labelledby={`user-management-tab-${index}`}
        {...other}
    >
        {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
);

const UsersManagement = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
    const [isDisconnecting, setDisconnecting] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    
    useEffect(() => {
    }, [activeTab]);

    const { handleOpenSnackbar } = useSnackbarContext();
    const navigate = useNavigate();

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const fetchUsers = useCallback(async () => {
        try {
            const fetchedUsers = await getAllUsers();
            setUsers(fetchedUsers);
        } catch (error) {
            console.error(error);
            handleOpenSnackbar('Failed to fetch users', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [handleOpenSnackbar]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddUser = async (newUserData: Omit<UserData, 'id' | 'company_id'>) => {
        try {
            await registerUser(
                newUserData.display_email,
                newUserData.given_name,
                newUserData.family_name,
                newUserData.password!,
                newUserData.is_admin
            );
            handleOpenSnackbar('User added successfully', 'success');
            fetchUsers();
            return true;
        } catch (error) {
            console.error(error);
            handleOpenSnackbar('Failed to add user', 'error');
            return false;
        }
    };

    const handleUpdateUser = async (userId: string, data: Partial<UserData>) => {
        const originalUsers = [...users];
        const updatedUsers = users.map(u => u.id === userId ? { ...u, ...data } : u);
        setUsers(updatedUsers);

        try {
            const userStatus = await getUserStatus();
            if (userId === userStatus.userId && data.is_admin !== undefined) {
                 handleOpenSnackbar('You cannot change your own admin privileges.', 'warning');
                 setUsers(originalUsers);
                 return;
            }
            await updateUser(userId, data);
            handleOpenSnackbar('User updated successfully', 'success');
        } catch (error) {
            setUsers(originalUsers);
            console.error(error);
            handleOpenSnackbar('Failed to update user', 'error');
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const userStatus = await getUserStatus();
            if (userStatus.userId === userToDelete.id) {
                await deleteUser(userToDelete.id);
                navigate('/login');
                handleOpenSnackbar('User deleted successfully. You have been logged out.', 'success');
            } else {
                await deleteUser(userToDelete.id);
                handleOpenSnackbar('User deleted successfully', 'success');
                setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
            }
        } catch (error) {
            console.error(error);
            handleOpenSnackbar('Failed to delete user', 'error');
        } finally {
            setUserToDelete(null);
        }
    };

    const handleQbDisconnect = async () => {
        try {
            await disconnectQB();
            navigate('/');
            handleOpenSnackbar('All QuickBooks data removed successfully', 'success');
        } catch (error) {
            console.error(error);
            handleOpenSnackbar('Failed to disconnect from QuickBooks', 'error');
        } finally {
            setDisconnecting(false);
        }
    };
    
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
                <title>Smart Picker | User Management</title>
            <Stack spacing={4}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                        <Typography variant="h4" component="h1" fontWeight="bold">
                            User Management
                        </Typography>
                        <Typography color="text.secondary">
                            Add, edit, or remove users from your organization.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        onClick={() => setAddDialogOpen(true)}
                        disabled={users.length >= 5}
                        startIcon={<AddIcon />}
                        sx={{ flexShrink: 0 }}
                    >
                        Add User
                    </Button>
                </Stack>

                {/* Tabs for User Management and Permissions */}
                <Paper sx={{ width: '100%' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs 
                            value={activeTab} 
                            onChange={handleTabChange}
                            aria-label="user management tabs"
                            sx={{ px: 2 }}
                        >
                            <Tab 
                                icon={<AddIcon />} 
                                label="User Management" 
                                iconPosition="start"
                            />
                            <Tab 
                                icon={<SecurityIcon />} 
                                label="User Permissions" 
                                iconPosition="start"
                            />
                        </Tabs>
                    </Box>

                    <TabPanel value={activeTab} index={0}>
                        {users.length >= 5 && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                You have reached the maximum limit of 5 users. To add a new user, please delete an existing one.
                            </Alert>
                        )}
                        
                        {isLoading ? (
                            <UserTableSkeleton />
                        ) : (
                            <UserTable
                                users={users}
                                onDeleteUser={(user) => setUserToDelete(user)}
                                onUpdateUser={handleUpdateUser}
                            />
                        )}
                    </TabPanel>

                    <TabPanel value={activeTab} index={1}>
                        <UserPermissionsManager />
                    </TabPanel>
                </Paper>

                 <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<PowerOffIcon />}
                        onClick={() => setDisconnecting(true)}
                    >
                        Disconnect QuickBooks
                    </Button>
                </Box>
            </Stack>
            
            <AddUserDialog
                open={isAddDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onAddUser={handleAddUser}
            />

            <ConfirmationDialog
                open={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleDeleteUser}
                confirmColor="error"
                title="Delete User?"
                content={`Are you sure you want to delete the user "${userToDelete?.given_name}"? This action cannot be undone.`}
            />
            
            <ConfirmationDialog
                open={isDisconnecting}
                onClose={() => setDisconnecting(false)}
                onConfirm={handleQbDisconnect}
                title="Disconnect from QuickBooks?"
                content="Are you sure? This will permanently delete all associated QuickBooks data from our system. This action cannot be undone."
                confirmColor="error"
                confirmText="Disconnect"
            />
        </Container>
    );
};

export default UsersManagement;