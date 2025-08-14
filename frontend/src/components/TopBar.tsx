import React, { useState } from 'react';
import {
  AppBar, 
  Button, 
  IconButton, 
  Toolbar, 
  Typography, 
  useTheme,
  useMediaQuery, 
  Box, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Divider,
  Badge,
  Chip,
  Stack
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Assignment as AssignmentIcon,
  DirectionsRun as DirectionsRunIcon,
  Inventory as InventoryIcon,
  UploadFile as UploadFileIcon,
  Group as GroupIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import NotificationBell from './NotificationBell';

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
  const { isAdmin } = useAuth();

  return (
    <>
      {isAdmin && (
        <>
          {isMobile ? (
            <Tooltip title="Orders to Check">
              <IconButton 
                color="primary" 
                onClick={() => navigate('/orders-to-check')}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <AssignmentIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button 
              startIcon={<AssignmentIcon />} 
              onClick={() => navigate('/orders-to-check')}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(59,130,246,0.1)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Orders to Check
            </Button>
          )}

          {isMobile ? (
            <Tooltip title="Manage Runs">
              <IconButton 
                color="primary" 
                onClick={() => navigate('/run')}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <DirectionsRunIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Button 
              startIcon={<DirectionsRunIcon />} 
              onClick={() => navigate('/run')}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                px: 2,
                '&:hover': {
                  backgroundColor: 'rgba(59,130,246,0.1)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const mobileMenuOpen = Boolean(mobileMenuAnchor);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleMobileMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => setMobileMenuAnchor(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleMobileMenuClose = () => setMobileMenuAnchor(null);
  const handleTitleClick = () => navigate(disableTopBar ? '/' : '/dashboard');
  const handleMenuItemClick = (path: string) => {
    navigate(path);
    handleMenuClose();
    handleMobileMenuClose();
  };
  
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'rgba(59,130,246,0.1)',
        background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', py: 1, px: { xs: 1, sm: 2 } }}>
        {/* Logo/Brand Section */}
        <Box 
          onClick={handleTitleClick} 
          sx={{ 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            '&:hover': {
              transform: 'scale(1.02)'
            },
            transition: 'transform 0.2s ease'
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            SP
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 'bold', 
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Smart Picker
          </Typography>
        </Box>

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
                  borderRadius: 2,
                  px: 2,
                  '&:hover': { 
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                About
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => navigate('/login')}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '20px',
                  px: 3,
                  background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(59,130,246,0.4)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Login
              </Button>
            </>
          ) : (
            // Protected route navigation items
            <>
              {/* Desktop Navigation */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                <AuthenticatedNavItems />
              </Box>

              {/* Mobile Menu Button */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <IconButton 
                  onClick={handleMobileMenuClick}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(59,130,246,0.1)'
                    }
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>

              {/* Notifications Icon */}
              <NotificationBell />

              {/* Settings Menu */}
              <Tooltip title="Settings">
                <IconButton 
                  onClick={handleMenuClick}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(59,130,246,0.1)'
                    }
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>

              {/* User Profile */}
              <Box sx={{ ml: 1 }}>
                <IconButton 
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(59,130,246,0.1)'
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}
                  >
                    U
                  </Avatar>
                </IconButton>
              </Box>

              {/* Desktop Settings Menu */}
              <Menu 
                id="settings-menu" 
                anchorEl={anchorEl} 
                open={open} 
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    borderRadius: 2,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(59,130,246,0.1)',
                    minWidth: 200
                  }
                }}
              >
                <SettingsMenuContent onMenuItemClick={handleMenuItemClick} />
              </Menu>

              {/* Mobile Menu */}
              <Menu 
                id="mobile-menu" 
                anchorEl={mobileMenuAnchor} 
                open={mobileMenuOpen} 
                onClose={handleMobileMenuClose}
                PaperProps={{
                  sx: {
                    borderRadius: 2,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(59,130,246,0.1)',
                    minWidth: 250
                  }
                }}
              >
                <MobileMenuContent onMenuItemClick={handleMenuItemClick} />
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
    const { isAdmin } = useAuth();

    return (
        <div>
            <MenuItem 
              onClick={() => onMenuItemClick('/dashboard')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
                <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Dashboard</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={() => onMenuItemClick('/settings/products')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
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
            <Divider sx={{ my: 1 }} />
            <MenuItem 
              onClick={() => onMenuItemClick('/logout')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(220,38,38,0.1)' },
                color: 'error.main'
              }}
            >
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Logout</ListItemText>
            </MenuItem>
        </div>
    );
}

// ====================================================================================
// 4. Mobile Menu Content
// ====================================================================================
const MobileMenuContent: React.FC<{ onMenuItemClick: (path: string) => void }> = ({ onMenuItemClick }) => {
    const { isAdmin } = useAuth();

    return (
        <div>
            <MenuItem 
              onClick={() => onMenuItemClick('/dashboard')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
                <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Dashboard</ListItemText>
            </MenuItem>
            
            {isAdmin && (
              <>
                <MenuItem 
                  onClick={() => onMenuItemClick('/orders-to-check')}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
                  }}
                >
                    <ListItemIcon><AssignmentIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Orders to Check</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={() => onMenuItemClick('/run')}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
                  }}
                >
                    <ListItemIcon><DirectionsRunIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Manage Runs</ListItemText>
                </MenuItem>
              </>
            )}
            
            <MenuItem 
              onClick={() => onMenuItemClick('/settings/products')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
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
            
            <Divider sx={{ my: 1 }} />
            <MenuItem 
              onClick={() => onMenuItemClick('/logout')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(220,38,38,0.1)' },
                color: 'error.main'
              }}
            >
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Logout</ListItemText>
            </MenuItem>
        </div>
    );
}

export default TopBar;