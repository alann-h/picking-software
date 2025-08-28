// UserTable.tsx
import React from 'react';
import {
    Box,
    Typography,
    TableCell,
    TableRow,
    Checkbox,
    FormControl,
    MenuItem,
    Select,
    Chip,
    IconButton,
    Tooltip,
    Stack,
} from '@mui/material';
import { 
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { ExtendedUserData } from './types';
import { canEditUser, canDeleteUser, canChangePermissions } from './utils';

interface UserTableProps {
    userList: ExtendedUserData[];
    currentUser: ExtendedUserData | null;
    isLoading: boolean;
    updatePermissionsMutation: any;
    onEditUser: (user: ExtendedUserData) => void;
    onDeleteUser: (user: ExtendedUserData) => void;
    onPermissionUpdate: (userId: string, field: string, value: any) => void;
}



const UserTable: React.FC<UserTableProps> = ({
    userList,
    currentUser,
    isLoading,
    updatePermissionsMutation,
    onEditUser,
    onDeleteUser,
    onPermissionUpdate,
}) => {
    if (isLoading) {
        return (
            <TableRow>
                <TableCell colSpan={7}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">Loading users...</Typography>
                    </Box>
                </TableCell>
            </TableRow>
        );
    }

    if (userList.length === 0) {
        return (
            <TableRow>
                <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">No users found</Typography>
                </TableCell>
            </TableRow>
        );
    }

    return (
        <>
            {userList.map((user: ExtendedUserData) => {
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
                            <Checkbox
                                checked={user.is_admin || false}
                                onChange={(e) => onPermissionUpdate(user.id, 'is_admin', e.target.checked)}
                                color="primary"
                                disabled={!canChangePerms || updatePermissionsMutation.isPending}
                            />
                        </TableCell>

                        {/* Access Level */}
                        <TableCell align="center">
                            <FormControl size="small" fullWidth>
                                <Select
                                    value={user.access_level || 'read'}
                                    onChange={(e) => onPermissionUpdate(user.id, 'access_level', e.target.value)}
                                    disabled={!canChangePerms || updatePermissionsMutation.isPending}
                                    size="small"
                                >
                                    <MenuItem value="read">Read</MenuItem>
                                    <MenuItem value="write">Write</MenuItem>
                                    <MenuItem value="admin">Admin</MenuItem>
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
                                            onClick={() => onEditUser(user)}
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
                                            onClick={() => onDeleteUser(user)}
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
            })}
        </>
    );
};

export default UserTable;