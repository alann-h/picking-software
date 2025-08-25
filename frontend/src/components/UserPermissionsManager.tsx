import React, { useState } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminFunctions } from '../hooks/useAuth';
import { CompanyUserPermission } from '../api/permissions';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip
} from '@mui/material';
import { useSnackbarContext } from './SnackbarContext';

interface User extends CompanyUserPermission {}

const UserPermissionsManager: React.FC = () => {
  const { getCompanyUserPermissions, updateUserPermissions } = useAdminFunctions();
  const { handleOpenSnackbar } = useSnackbarContext();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  // TanStack Query with Suspense for fetching users
  const {
    data: users,
    refetch: loadUsers
  } = useSuspenseQuery({
    queryKey: ['companyUserPermissions'],
    queryFn: getCompanyUserPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const typedUsers = users as User[];

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, field, value }: { userId: string; field: string; value: any }) => {
      const currentUser = typedUsers.find(u => u.id === userId);
      if (!currentUser) throw new Error('User not found');

      const updatedPermissions = {
        canAccessQBO: field === 'can_access_qbo' ? value : currentUser.can_access_qbo,
        canAccessXero: field === 'can_access_xero' ? value : currentUser.can_access_xero,
        canRefreshTokens: field === 'can_refresh_tokens' ? value : currentUser.can_refresh_tokens,
        accessLevel: field === 'access_level' ? value : currentUser.access_level,
      };

      return updateUserPermissions(userId, updatedPermissions);
    },
    onMutate: async ({ userId, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ['companyUserPermissions'] });

      const previousUsers = queryClient.getQueryData(['companyUserPermissions']);

      queryClient.setQueryData(['companyUserPermissions'], (old: any) => {
        if (!old) return old;
        return old.map((user: any) =>
          user.id === userId ? { ...user, [field]: value } : user
        );
      });
      return { previousUsers };
    },
    onError: (err, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['companyUserPermissions'], context.previousUsers);
      }
      handleOpenSnackbar('Failed to update user permissions', 'error');
      console.error('Error updating permissions:', err);
    },
    onSuccess: () => {
      handleOpenSnackbar('User permissions updated successfully!', 'success');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['companyUserPermissions'] });
    },
  });

  const handlePermissionUpdate = async (userId: string, field: string, value: any) => {
    setUpdating(userId);
    try {
      await updatePermissionMutation.mutateAsync({ userId, field, value });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h2">
          User Permissions Management
        </Typography>
        <Button 
          variant="outlined"
          onClick={() => loadUsers()}
          startIcon={<span>🔄</span>}
        >
          Refresh
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell align="center">QBO Access</TableCell>
              <TableCell align="center">Xero Access</TableCell>
              <TableCell align="center">Can Refresh Tokens</TableCell>
              <TableCell align="center">Access Level</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(typedUsers) ? typedUsers.map(user => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      {user.display_email}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        {user.given_name} {user.family_name}
                      </Typography>
                      {user.is_admin && (
                        <Chip 
                          label="Admin" 
                          size="small" 
                          color="primary" 
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell align="center">
                  <Checkbox
                    checked={user.can_access_qbo}
                    onChange={(e) => handlePermissionUpdate(user.id, 'can_access_qbo', e.target.checked)}
                    disabled={updating === user.id}
                    color="primary"
                  />
                </TableCell>
                
                <TableCell align="center">
                  <Checkbox
                    checked={user.can_access_xero}
                    onChange={(e) => handlePermissionUpdate(user.id, 'can_access_xero', e.target.checked)}
                    disabled={updating === user.id}
                    color="primary"
                  />
                </TableCell>
                
                <TableCell align="center">
                  <Checkbox
                    checked={user.can_refresh_tokens}
                    onChange={(e) => handlePermissionUpdate(user.id, 'can_refresh_tokens', e.target.checked)}
                    disabled={updating === user.id}
                    color="primary"
                  />
                </TableCell>
                
                <TableCell align="center">
                  <FormControl size="small" disabled={updating === user.id}>
                    <Select
                      value={user.access_level}
                      onChange={(e) => handlePermissionUpdate(user.id, 'access_level', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="read">Read</MenuItem>
                      <MenuItem value="write">Write</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                
                <TableCell align="center">
                  {updating === user.id ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      onClick={() => handlePermissionUpdate(user.id, 'access_level', user.access_level)}
                    >
                      Save
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    {!typedUsers ? 'Loading...' : 'No users found or invalid data format'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
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
      </Box>
    </Box>
  );
};

export default UserPermissionsManager;
