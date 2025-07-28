// UserTable.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Switch, Typography } from '@mui/material';
import { Delete as DeleteIcon, NoAccounts as NoAccountsIcon } from '@mui/icons-material';
import { UserData } from '../../utils/types';
import EditableCell from './EditableCell';

interface UserTableProps {
    users: UserData[];
    onDeleteUser: (_user: UserData) => void;
    onUpdateUser: (_userId: string, _data: Partial<UserData>) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onDeleteUser, onUpdateUser }) => {
    if (users.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
                <NoAccountsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6">No Users Found</Typography>
                <Typography color="text.secondary">Click &quot;Add User&quot; to get started.</Typography>
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>First Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Last Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Password</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Admin</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id} hover>
                            <EditableCell user={user} field="given_name" onSave={onUpdateUser} />
                            <EditableCell user={user} field="family_name" onSave={onUpdateUser} />
                            <EditableCell user={user} field="display_email" onSave={onUpdateUser} />
                            <EditableCell user={user} field="password" onSave={onUpdateUser} />
                            <TableCell align="center">
                                <Switch
                                    checked={user.is_admin}
                                    onChange={(e) => onUpdateUser(user.id, { is_admin: e.target.checked })}
                                />
                            </TableCell>
                            <TableCell align="right">
                                <IconButton onClick={() => onDeleteUser(user)} color="error" size="small">
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
export default UserTable;