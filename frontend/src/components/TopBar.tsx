import React from 'react';
import { AppBar, Button, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useNavigate } from 'react-router-dom';
import { useUserStatus } from '../utils/useUserStatus'; 

interface TopBarProps {
  disableTopBar: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ disableTopBar }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAdmin } = useUserStatus(disableTopBar);

  if (disableTopBar) {
    return (
      <AppBar position="static" color="transparent" elevation={0} sx={{ 
        background: 'linear-gradient(to right, #ece9e6, #ffffff)', 
        borderBottom: "1px solid #dce0d7"
      }}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              cursor: 'pointer',
              fontWeight: 'bold',
              color: theme.palette.primary.main,
            }}
            onClick={() => navigate('/')}
          >
            SmartPicker
          </Typography>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ 
      background: 'linear-gradient(to right, #ece9e6, #ffffff)', 
      borderBottom: "1px solid #dce0d7"
    }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          variant="h6"
          sx={{
            cursor: 'pointer',
            fontWeight: 'bold',
            color: theme.palette.primary.main,
          }}
          onClick={() => navigate('/dashboard')}
        >
          SmartPicker
        </Typography>
        <div>
          {isAdmin && (
            <Button
              startIcon={<AssignmentIcon />}
              onClick={() => navigate('/orders-to-check')}
              sx={{ marginRight: 2 }}
            >
              Orders to Check
            </Button>
          )}
          <IconButton 
            color="inherit" 
            onClick={() => navigate('/settings')} 
            disabled={!isAdmin}
          >
            <SettingsIcon />
          </IconButton>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;