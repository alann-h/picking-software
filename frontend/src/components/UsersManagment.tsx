import React, { useState, useEffect } from 'react';
import {  
  Box, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  IconButton,  
  Switch,  
  TextField, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  CircularProgress, 
  Container
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbarContext } from './SnackbarContext';
import { getAllUsers, registerUser, deleteUser, updateUser, getUserStatus } from '../api/user';
import { UserData } from '../utils/types';
import { useNavigate } from 'react-router-dom';
import { disconnectQB } from '../api/auth';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';

const userSchema = z.object({
  given_name: z.string().min(1, "First name is required."),
  family_name: z.string(),
  email: z.email("Please enter a valid email address."),
  password: z.string()
    .min(8, "Password must be at least 8 characters long.")
    .refine(data => /[A-Z]/.test(data), "Password must contain an uppercase letter.")
    .refine(data => /[0-9]/.test(data), "Password must contain a number.")
    .refine(data => /[^A-Za-z0-9]/.test(data), "Password must contain a symbol."),
  is_admin: z.boolean(),
  id: z.string().optional(),
  company_id: z.number().optional(),
});

const passwordUpdateSchema = userSchema.pick({ password: true });

interface ErrorTree {
  errors: string[];
  properties?: {
    [key: string]: ErrorTree;
  }
}
type FormErrors = ErrorTree | null;

const DEFAULT_USER: UserData = {
  id: '',
  email: '',
  password: '',
  given_name: '',
  family_name: '',
  is_admin: false,
  company_id: 1
};

const UsersManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState<UserData>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState(true);
  const { handleOpenSnackbar } = useSnackbarContext();
  
  const [editingField, setEditingField] = useState<{
    userId: string;
    field: keyof UserData;
    error?: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [dialogErrors, setDialogErrors] = useState<FormErrors>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const getUsers = await getAllUsers();
        setUsers(getUsers);
        setIsLoading(false);
      } catch (error) {
        handleOpenSnackbar('Failed to fetch users', 'error');
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [handleOpenSnackbar]);

  const handleAddUser = async () => {
    if (users.length >= 5) {
      handleOpenSnackbar('Maximum number of users (5) reached', 'error');
      return;
    }

    const validationResult = userSchema.safeParse(newUser);
    if (!validationResult.success) {
      setDialogErrors(z.treeifyError(validationResult.error));
      return;
    }

    try {
      console.log(validationResult.data);
      await registerUser(
        validationResult.data.email,
        validationResult.data.given_name,
        validationResult.data.family_name || '',
        validationResult.data.password,
        validationResult.data.is_admin
      );
      
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);

      handleOpenSnackbar('User added successfully', 'success');
      setNewUser(DEFAULT_USER);
      setIsAddingUser(false);
      setDialogErrors(null);
    } catch (error) {
      handleOpenSnackbar('Failed to add user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const userStatus = await getUserStatus();

      if (userStatus.userId === userId) {
        navigate('/login'); 
      }
      await deleteUser(userId);
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      
      handleOpenSnackbar('User deleted successfully', 'success');
    } catch (error) {
      handleOpenSnackbar('Failed to delete user', 'error');
    }
  };

  const handleInputChange = (field: keyof UserData, value: string | boolean) => {
    setNewUser(prev => ({ ...prev, [field]: value }));
    if (dialogErrors && dialogErrors.properties?.[field as keyof UserData]) {
      setDialogErrors(prev => {
        if (!prev || !prev.properties) return prev;
        const newProperties = { ...prev.properties };
        delete newProperties[field as keyof UserData];
        const newState: ErrorTree = { errors: prev.errors, properties: newProperties };
        return newState;
      });
    }
  };

  const handleFieldClick = (userId: string, field: keyof UserData, value: string) => {
    setEditingField({ userId, field });
    setEditValue(value);
  };

  const handleFieldSave = async (userId: string) => {
    if (!editingField) return;

    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    if (editingField.field === 'password') {
      if (!editValue) {
        setEditingField(null);
        return;
      }
      const validationResult = passwordUpdateSchema.safeParse({ password: editValue });
      if (!validationResult.success) {
        const errorTree = z.treeifyError(validationResult.error);
        setEditingField({ ...editingField, error: errorTree.properties?.password?.errors[0] });
        return;
      }
    } else {
        if (editValue === userToUpdate[editingField.field]) {
            setEditingField(null);
            return;
        }
    }

    try {
      const updatedUser = { ...userToUpdate, [editingField.field]: editValue };
      await updateUser(userId, updatedUser.email, updatedUser.password, updatedUser.given_name, updatedUser.family_name, updatedUser.is_admin);
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      handleOpenSnackbar('User updated successfully', 'success');
    } catch (error) {
      handleOpenSnackbar('Failed to update user', 'error');
    } finally {
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleAdminToggle = async (user: UserData, newAdminStatus: boolean) => {
    try {
      const userStatus = await getUserStatus();
      if (userStatus.userId === user.id && newAdminStatus !== userStatus.isAdmin) {
        handleOpenSnackbar('Cannot change your own admin privileges!', 'error');
        return
      }
      await updateUser(
        user.id, user.email, user.password, user.given_name, user.family_name, newAdminStatus
      );
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);
      handleOpenSnackbar('User updated successfully', 'success');
    } catch (error) {
      handleOpenSnackbar('Failed to update user', 'error');
    }
  };

  const handleQbDisconnect = async() => {
    try {
      await disconnectQB();
      navigate('/');
      handleOpenSnackbar('All quickbooks data removed successfully', 'success');
    } catch (e) {
      handleOpenSnackbar('Cannot remove all Quickbooks Data', 'error')
    }
  }

  const renderEditableCell = (user: UserData, field: keyof UserData, displayValue: string) => {
    const isEditing = editingField?.userId === user.id && editingField?.field === field;
    const errorText = isEditing ? editingField?.error : undefined;

    if (isEditing) {
      return (
        <TableCell>
          <TextField
            autoFocus
            size="small"
            type={field === 'password' ? 'password' : 'text'}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              if (editingField?.error) {
                setEditingField({ ...editingField, error: undefined });
              }
            }}
            onBlur={() => handleFieldSave(user.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave(user.id) }}
            error={!!errorText}
            helperText={errorText}
          />
        </TableCell>
      );
    }

    return (
      <TableCell
        onClick={() => handleFieldClick(user.id, field, field === 'password' ? '' : displayValue)}
        sx={{ cursor: 'pointer' }}
      >
        {field === 'password' ? '•'.repeat(8) : displayValue}
      </TableCell>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Helmet>
        <title>Smart Picker | User Management</title>
      </Helmet>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={() => setIsAddingUser(true)}
          disabled={users.length >= 5}
          startIcon={<AddIcon />}
        >
          Add User
        </Button>
      </Box>

      {users.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>No Users Available</Typography>
          <Typography variant="body2" color="text.secondary">
            Click the Add User button to add users to the system.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Password</TableCell>
                <TableCell align="center">Admin</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  {renderEditableCell(user, 'given_name', user.given_name)}
                  {renderEditableCell(user, 'family_name', user.family_name)}
                  {renderEditableCell(user, 'email', user.email)}
                  {renderEditableCell(user, 'password', user.password)}
                  <TableCell align="center">
                    <Switch
                      checked={user.is_admin}
                      size="small"
                      onChange={(e) => handleAdminToggle(user, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleDeleteUser(user.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
        </TableContainer>
      )}
      <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color="error"
          onClick={handleQbDisconnect}
        >
          Disconnect QB
        </Button>
      </Box>
      <Dialog 
        open={isAddingUser} 
        onClose={() => setIsAddingUser(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                fullWidth
                value={newUser.given_name}
                onChange={(e) => handleInputChange('given_name', e.target.value)}
                error={!!dialogErrors?.properties?.given_name?.errors.length}
                helperText={dialogErrors?.properties?.given_name?.errors[0]}
                required
              />
              <TextField
                label="Last Name"
                fullWidth
                value={newUser.family_name}
                onChange={(e) => handleInputChange('family_name', e.target.value)}
                error={!!dialogErrors?.properties?.family_name?.errors.length}
                helperText={dialogErrors?.properties?.family_name?.errors[0]}
              />
            </Box>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newUser.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!dialogErrors?.properties?.email?.errors.length}
              helperText={dialogErrors?.properties?.email?.errors[0]}
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={newUser.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={!!dialogErrors?.properties?.password?.errors.length}
              helperText={dialogErrors?.properties?.password?.errors[0]}
              required
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography>Admin Access</Typography>
              <Switch
                checked={newUser.is_admin}
                onChange={(e) => handleInputChange('is_admin', e.target.checked)}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => { setIsAddingUser(false); setDialogErrors(null); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddUser}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UsersManagement;
