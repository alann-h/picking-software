import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  isLoginPage: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ isLoginPage }) => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/dashboard/settings');
  };

  const handleLogoClick = () => {
    if (!isLoginPage) {
      navigate('/dashboard');
    }
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#b0bec5' }}>
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, cursor: !isLoginPage ? 'pointer' : 'default' }}
          onClick={handleLogoClick}
        >
          SmartPicker
        </Typography>
        <IconButton color="inherit" disabled={isLoginPage} onClick={handleSettingsClick}>
          <SettingsIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
