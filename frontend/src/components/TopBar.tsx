import React, { useState } from 'react';
import {
  AppBar, 
  Button, 
  IconButton, 
  Toolbar, 
  Typography, 
  Box, 
  Tooltip, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  DirectionsRun as DirectionsRunIcon,
  Inventory as InventoryIcon,
  UploadFile as UploadFileIcon,
  Group as GroupIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  DevicesOther as DevicesOtherIcon,
  Menu as MenuIcon,
  History as HistoryIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import { logoutAllDevices, getUserSessions } from '../api/auth';

interface TopBarProps {
  disableTopBar: boolean;
}

// ====================================================================================
// 1. Child component for items that need authentication
// This component is ONLY rendered on protected pages, so useAuth() is always safe here.
// ====================================================================================
const AuthenticatedNavItems: React.FC<{ onAdminMenuClick: (event: React.MouseEvent<HTMLButtonElement>) => void }> = ({ onAdminMenuClick }) => {
  const { isAdmin } = useAuth();

  return (
    <>
      {isAdmin && (
        <Tooltip title="Admin Operations">
          <IconButton 
            color="primary" 
            onClick={onAdminMenuClick}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(59,130,246,0.1)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
};

// ====================================================================================
// 1.5. Admin Menu Content
// ====================================================================================
const AdminMenuContent: React.FC<{ onMenuItemClick: (path: string) => void; onClose: () => void }> = ({ onMenuItemClick, onClose }) => {
    const handleClick = (path: string) => {
        onMenuItemClick(path);
        onClose();
    };

    return (
        <div>
            <MenuItem 
              onClick={() => handleClick('/orders-to-check')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
                <ListItemIcon><AssignmentIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Orders to Check</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={() => handleClick('/run')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
                <ListItemIcon><DirectionsRunIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Manage Runs</ListItemText>
            </MenuItem>
            <MenuItem 
              onClick={() => handleClick('/order-history')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
                <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Order History</ListItemText>
            </MenuItem>
        </div>
    );
}

// ====================================================================================
// 2. The main TopBar component
// This component no longer calls useAuth directly.
// ====================================================================================
const TopBar: React.FC<TopBarProps> = ({ disableTopBar }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);
  
  const open = Boolean(anchorEl);
  const mobileMenuOpen = Boolean(mobileMenuAnchor);
  const adminMenuOpen = Boolean(adminMenuAnchor);

  const authData = disableTopBar ? null : useAuth();
  const userName = authData?.userName || null;
  const userEmail = authData?.userEmail || null;

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleMobileMenuClose = () => setMobileMenuAnchor(null);
  const handleAdminMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => setAdminMenuAnchor(event.currentTarget);
  const handleAdminMenuClose = () => setAdminMenuAnchor(null);
  const handleTitleClick = () => navigate(disableTopBar ? '/' : '/dashboard');
  const handleMenuItemClick = (path: string) => {
    if (path === '/logout') {
      // Clear remember me preference and logout
      localStorage.removeItem('rememberMe');
      // You can add a logout API call here if needed
      navigate('/login');
    } else if (path === '/logout-all') {
      // Show confirmation dialog for logout from all devices
      setLogoutAllDialogOpen(true);
    } else if (path === '/sessions') {
      // Show active sessions information
      showActiveSessions();
    } else {
      navigate(path);
    }
    handleMenuClose();
    handleMobileMenuClose();
  };

  const handleLogoutAllDevices = async () => {
    try {
      // Call logout from all devices API
      await logoutAllDevices();
      // Clear remember me preference
      localStorage.removeItem('rememberMe');
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error logging out from all devices:', error);
      // Even if API fails, clear local state and redirect
      localStorage.removeItem('rememberMe');
      navigate('/login');
    } finally {
      // Close the dialog
      setLogoutAllDialogOpen(false);
    }
  };

  const showActiveSessions = async () => {
    try {
      const sessions = await getUserSessions();
      
      if (sessions.totalSessions === 0) {
        alert('You have no active sessions.');
        return;
      }
      
      // Show sessions info in an alert (you can enhance this with a proper dialog later)
      const sessionDetails = sessions.activeSessions.map((s: any) => 
        `${s.isCurrentSession ? '🟢' : '🔵'} ${s.name || 'Unknown'} - ${s.email}\n   Expires: ${new Date(s.expiresAt).toLocaleString()}`
      ).join('\n\n');
      
      alert(`You have ${sessions.totalSessions} active session(s).\n\nSession details:\n${sessionDetails}`);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
      } else if (error.response?.status === 500) {
        alert('Server error while fetching sessions. Please try again later.');
      } else {
        alert('Could not fetch active sessions. Please try again.');
      }
    }
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
                onClick={() => navigate('/about-us')}
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
                <AuthenticatedNavItems onAdminMenuClick={handleAdminMenuClick} />
              </Box>

              {/* Mobile Admin Menu Button - Only show on mobile */}
              {authData && (
                <Box sx={{ display: { xs: 'flex', md: 'none' }, ml: 1 }}>
                  <Tooltip title="Admin Operations">
                    <IconButton 
                      color="primary" 
                      onClick={handleAdminMenuClick}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(59,130,246,0.1)',
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {/* User Profile - Only show when we have auth data */}
              {authData && (
                <Box sx={{ ml: 1 }}>
                  <IconButton 
                    onClick={handleMenuClick}
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
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                  </IconButton>
                </Box>
              )}

              {/* Desktop Settings Menu */}
              {authData && (
                <Menu 
                  id="settings-menu" 
                  anchorEl={anchorEl} 
                  open={open} 
                  onClose={handleMenuClose}
                  slotProps={{
                    paper: {
                      sx: {
                        borderRadius: 2,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(59,130,246,0.1)',
                        minWidth: 200
                      }
                    }
                  }}
                >
                  <SettingsMenuContent onMenuItemClick={handleMenuItemClick} userName={userName} userEmail={userEmail} />
                </Menu>
              )}

              {/* Admin Menu */}
              {authData && (
                <Menu 
                  id="admin-menu" 
                  anchorEl={adminMenuAnchor} 
                  open={adminMenuOpen} 
                  onClose={handleAdminMenuClose}
                  slotProps={{
                    paper: {
                      sx: {
                        borderRadius: 2,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(59,130,246,0.1)',
                        minWidth: 200
                      }
                    }
                  }}
                >
                  <AdminMenuContent onMenuItemClick={handleMenuItemClick} onClose={handleAdminMenuClose} />
                </Menu>
              )}

              {/* Mobile Menu */}
              {authData && (
                <Menu 
                  id="mobile-menu" 
                  anchorEl={mobileMenuAnchor} 
                  open={mobileMenuOpen} 
                  onClose={handleMobileMenuClose}
                  slotProps={{
                    paper: {
                      sx: {
                        borderRadius: 2,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(59,130,246,0.1)',
                        minWidth: 250
                      }
                    }
                  }}
                >
                  <MobileMenuContent onMenuItemClick={handleMenuItemClick} userName={userName} userEmail={userEmail} />
                </Menu>
              )}
            </>
          )}
        </Box>
      </Toolbar>
      
      {/* Confirmation Dialog for Logout from All Devices */}
      <Dialog
        open={logoutAllDialogOpen}
        onClose={() => setLogoutAllDialogOpen(false)}
        aria-labelledby="logout-all-dialog-title"
        aria-describedby="logout-all-dialog-description"
      >
        <DialogTitle id="logout-all-dialog-title">Confirm Logout from All Devices</DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-all-dialog-description">
            Are you sure you want to log out from all devices? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutAllDialogOpen(false)} color="primary">Cancel</Button>
          <Button onClick={handleLogoutAllDevices} color="error" variant="contained">
            Logout from All Devices
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

// ====================================================================================
// 3. A new component for the Menu items
// This ensures useAuth is only called for the menu when it's visible on a protected page.
// ====================================================================================
const SettingsMenuContent: React.FC<{ onMenuItemClick: (path: string) => void; userName: string | null; userEmail: string | null }> = ({ onMenuItemClick, userName, userEmail }) => {
    const { isAdmin } = useAuth();

    return (
        <div>
            {/* User Info Section */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {userName || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {userEmail || 'user@example.com'}
                </Typography>
            </Box>
            
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
                </MenuItem>,
            ]}
            <Divider sx={{ my: 1 }} />
            <MenuItem 
              onClick={() => onMenuItemClick('/sessions')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
                <ListItemIcon><DevicesOtherIcon fontSize="small" /></ListItemIcon>
                <ListItemText>View Active Sessions</ListItemText>
            </MenuItem>
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
            <MenuItem 
              onClick={() => onMenuItemClick('/logout-all')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(220,38,38,0.1)' },
                color: 'error.main'
              }}
            >
                <ListItemIcon><DevicesOtherIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Logout from All Devices</ListItemText>
            </MenuItem>
        </div>
    );
}

// ====================================================================================
// 4. Mobile Menu Content
// ====================================================================================
const MobileMenuContent: React.FC<{ onMenuItemClick: (path: string) => void; userName: string | null; userEmail: string | null }> = ({ onMenuItemClick, userName, userEmail }) => {
    const { isAdmin } = useAuth();

    return (
        <div>
            {/* User Info Section */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {userName || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {userEmail || 'user@example.com'}
                </Typography>
            </Box>
            
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
              onClick={() => onMenuItemClick('/sessions')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(59,130,246,0.1)' }
              }}
            >
                <ListItemIcon><DevicesOtherIcon fontSize="small" /></ListItemIcon>
                <ListItemText>View Active Sessions</ListItemText>
            </MenuItem>
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
            <MenuItem 
              onClick={() => onMenuItemClick('/logout-all')}
              sx={{
                '&:hover': { backgroundColor: 'rgba(220,38,38,0.1)' },
                color: 'error.main'
              }}
            >
                <ListItemIcon><DevicesOtherIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Logout from All Devices</ListItemText>
            </MenuItem>
        </div>
    );
}

export default TopBar;