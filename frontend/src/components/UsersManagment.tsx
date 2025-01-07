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
import { getAllUsers, registerUser, deleteUser } from '../api/user';

interface UserData {
  id: string;
  email: string;
  password: string;
  given_name: string;
  family_name: string;
  is_admin: boolean;
  company_id: number;
}

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
    // Only validate the email field as required
    if (!newUser.email) {
      handleOpenSnackbar('Email is required', 'error');
      return;
    }

    if (users.length >= 5) {
      handleOpenSnackbar('Maximum number of users (5) reached', 'error');
      return;
    }

    try {
      await registerUser(
        newUser.email,
        newUser.given_name,
        newUser.family_name,
        newUser.password,
        newUser.is_admin
      );
      
      const updatedUsers = await getAllUsers();
      setUsers(updatedUsers);

      handleOpenSnackbar('User added successfully', 'success');
      setNewUser(DEFAULT_USER);
      setIsAddingUser(false);
    } catch (error) {
      handleOpenSnackbar('Failed to add user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
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
                  <TableCell>{user.given_name}</TableCell>
                  <TableCell>{user.family_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{'•'.repeat(8)}</TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={user.is_admin}
                      size="small"
                      disabled
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
              />
              <TextField
                label="Last Name"
                fullWidth
                value={newUser.family_name}
                onChange={(e) => handleInputChange('family_name', e.target.value)}
              />
            </Box>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newUser.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={newUser.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
            />
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}>
              <Typography>Admin Access</Typography>
              <Switch
                checked={newUser.is_admin}
                onChange={(e) => handleInputChange('is_admin', e.target.checked)}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsAddingUser(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddUser}
            disabled={!newUser.email}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UsersManagement;