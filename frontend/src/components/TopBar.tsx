import React, { useState } from 'react';
import {
  AppBar, Button, IconButton, Toolbar, Typography, useTheme,
  useMediaQuery, Box, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import InventoryIcon from '@mui/icons-material/Inventory';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import GroupIcon from '@mui/icons-material/Group';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

interface TopBarProps {
  disableTopBar: boolean;
}

// ====================================================================================
// 1. Child component for items that need authentication
// This component is ONLY rendered on protected pages, so useAuth() is always safe here.
// ====================================================================================
const AuthenticatedNavItems: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const { isAdmin } = useAuth(); // This call is now safe.

  return (
    <>
      {isAdmin && (
        <>
          {isMobile ? (
            <Tooltip title="Orders to Check">
              <IconButton color="primary" onClick={() => navigate('/orders-to-check')}>
                <AssignmentIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button startIcon={<AssignmentIcon />} onClick={() => navigate('/orders-to-check')}>
              Orders to Check
            </Button>
          )}

          {isMobile ? (
            <Tooltip title="Manage Runs">
              <IconButton color="primary" onClick={() => navigate('/run')}>
                <DirectionsRunIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button startIcon={<DirectionsRunIcon />} onClick={() => navigate('/run')}>
              Manage Runs
            </Button>
          )}
        </>
      )}
    </>
  );
};

// ====================================================================================
// 2. The main TopBar component
// This component no longer calls useAuth directly.
// ====================================================================================
const TopBar: React.FC<TopBarProps> = ({ disableTopBar }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleTitleClick = () => navigate(disableTopBar ? '/' : '/dashboard');
  const handleMenuItemClick = (path: string) => {
    navigate(path);
    handleMenuClose();
  };
  
  return (
    <AppBar position="static" elevation={2} sx={{ backgroundColor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
        <Typography variant="h6" onClick={handleTitleClick} sx={{ cursor: 'pointer', fontWeight: 'bold', color: 'primary.main' }}>
          Smart Picker
        </Typography>

        {/* Navigation items - different for public vs protected routes */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {disableTopBar ? (
            // Public navigation items
            <>
              <Button 
                color="primary" 
                onClick={() => navigate('/about')}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.08)' }
                }}
              >
                About
              </Button>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => navigate('/login')}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '20px',
                  px: 3
                }}
              >
                Login
              </Button>
            </>
          ) : (
            // Protected route navigation items
            <>
              {/* 3. Conditionally render the child component. */}
              <AuthenticatedNavItems />

              <Tooltip title="Settings">
                <IconButton onClick={handleMenuClick}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>

              {/* The menu needs its own AuthProvider to safely check for isAdmin */}
              <Menu id="settings-menu" anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                  <SettingsMenuContent onMenuItemClick={handleMenuItemClick} />
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

// ====================================================================================
// 3. A new component for the Menu items
// This ensures useAuth is only called for the menu when it's visible on a protected page.
// ====================================================================================
const SettingsMenuContent: React.FC<{ onMenuItemClick: (path: string) => void }> = ({ onMenuItemClick }) => {
    const { isAdmin } = useAuth(); // This call is also safe here.

    return (
        <div>
            <MenuItem onClick={() => onMenuItemClick('/settings/products')}>
                <ListItemIcon><InventoryIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Current Products</ListItemText>
            </MenuItem>
            {isAdmin && [
                <MenuItem key="upload" onClick={() => onMenuItemClick('/settings/upload')}>
                    <ListItemIcon><UploadFileIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Upload Data</ListItemText>
                </MenuItem>,
                <MenuItem key="users" onClick={() => onMenuItemClick('/settings/users')}>
                    <ListItemIcon><GroupIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>User Management</ListItemText>
                </MenuItem>
            ]}
        </div>
    );
}

export default TopBar;