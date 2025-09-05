import React from 'react';
import { 
  Box, 
  Typography,
  Button
} from '@mui/material';
import { Person } from '@mui/icons-material';

interface UserSessionIndicatorProps {
  currentUser: { email: string; name?: string };
  onSwitchAccount: () => void;
}

const UserSessionIndicator: React.FC<UserSessionIndicatorProps> = ({
  currentUser,
  onSwitchAccount
}) => {
  return (
    <Box sx={{
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: 2,
      padding: 2,
      mb: 3,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Person sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="body2" color="text.secondary">
          Welcome back, <strong>{currentUser.email}</strong>
        </Typography>
      </Box>
      <Button
        size="small"
        variant="text"
        onClick={onSwitchAccount}
        sx={{ color: 'primary.main', textTransform: 'none' }}
      >
        Switch Account
      </Button>
    </Box>
  );
};

export default UserSessionIndicator;
