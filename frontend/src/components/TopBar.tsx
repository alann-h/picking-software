import React from 'react';
import { AppBar, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  isLoginPage: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ isLoginPage }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogoClick = () => {
    if (!isLoginPage) {
      navigate('/dashboard');
    }
  };

  const handleSettingsClick = () => {
    navigate('/dashboard/settings');
  };

  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          variant="h6"
          sx={{
            flexGrow: 1,
            cursor: !isLoginPage ? 'pointer' : 'default',
            fontWeight: 'bold',
            color: theme.palette.primary.main,
          }}
          onClick={handleLogoClick}
        >
          SmartPicker
        </Typography>
        {!isLoginPage && (
          <IconButton color="inherit" onClick={handleSettingsClick}>
            <SettingsIcon />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;