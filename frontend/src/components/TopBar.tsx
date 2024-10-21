import React from 'react';
import { AppBar, Button, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  isInitalPage: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ isInitalPage }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogoClick = () => {
    if (!isInitalPage) {
      navigate('/dashboard');
    }
  };

  const handleSettingsClick = () => {
    navigate('/dashboard/settings');
  };

  const handleOrdersToCheckClick = () => {
    navigate('/dashboard/orders-to-check');
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ background: 'linear-gradient(to right, #ece9e6, #ffffff)', borderBottom: "1px solid #dce0d7"}}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          variant="h6"
          sx={{
            cursor: !isInitalPage ? 'pointer' : 'default',
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            display: 'inline-block',
          }}
          onClick={handleLogoClick}
        >
          SmartPicker
        </Typography>
        {!isInitalPage && (
          <div>
            <Button
              startIcon={<AssignmentIcon />}
              onClick={handleOrdersToCheckClick}
              sx={{ marginRight: 2 }}
            >
              Orders to Check
            </Button>
            <IconButton color="inherit" onClick={handleSettingsClick}>
              <SettingsIcon />
            </IconButton>
          </div>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;