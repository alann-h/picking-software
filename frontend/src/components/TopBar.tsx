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
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import InventoryIcon from '@mui/icons-material/Inventory'; // New icon for products
import UploadFileIcon from '@mui/icons-material/UploadFile'; // New icon for upload
import GroupIcon from '@mui/icons-material/Group'; // New icon for users
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authProvider';

interface TopBarProps {
  disableTopBar: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ disableTopBar }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { isAdmin } = !disableTopBar ? useAuth() : { isAdmin: false };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTitleClick = () => {
    navigate(disableTopBar ? '/' : '/dashboard');
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderBottom: '1px solid',
        borderColor: theme.palette.divider,
      }}
    >
      <Toolbar
        sx={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          py: 1.5,
        }}
      >
        <Typography
          variant="h6"
          onClick={handleTitleClick}
          sx={{
            cursor: 'pointer',
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            fontSize: isMobile ? '1.2rem' : '1.5rem',
            '&:hover': {
              color: theme.palette.primary.dark,
            },
          }}
        >
          Smart Picker
        </Typography>

        {!disableTopBar && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: isMobile ? 1 : 2,
              alignSelf: isMobile ? 'flex-end' : 'auto',
              mt: isMobile ? 1 : 0,
            }}
          >
            {isAdmin && (
              <>
                {isMobile ? (
                  <Tooltip title="Orders to Check">
                    <IconButton
                      color="inherit"
                      onClick={() => navigate('/orders-to-check')}
                      aria-label="orders to check"
                    >
                      <AssignmentIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Button
                    startIcon={<AssignmentIcon />}
                    onClick={() => navigate('/orders-to-check')}
                    variant="text"
                  >
                    Orders to Check
                  </Button>
                )}

                {isMobile ? (
                  <Tooltip title="Manage Runs">
                    <IconButton
                      color="inherit"
                      onClick={() => navigate('/runs')}
                      aria-label="manage runs"
                    >
                      <DirectionsRunIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Button
                    startIcon={<DirectionsRunIcon />}
                    onClick={() => navigate('/run')}
                    variant="text"
                  >
                    Manage Runs
                  </Button>
                )}
              </>
            )}

            <Tooltip title="Settings">
              <IconButton
                onClick={handleMenuClick}
                aria-controls={open ? 'settings-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                aria-label="settings menu"
                sx={{ color: theme.palette.text.primary }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Menu
              id="settings-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              slotProps={{list:{'aria-labelledby': 'settings-button'}}}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => handleMenuItemClick('/settings/products')}>
                <ListItemIcon>
                  <InventoryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Current Products</ListItemText>
              </MenuItem>
              {isAdmin && [
                <MenuItem key="upload" onClick={() => handleMenuItemClick('/settings/upload')}>
                  <ListItemIcon>
                    <UploadFileIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Upload Data</ListItemText>
                </MenuItem>,
                <MenuItem key="users" onClick={() => handleMenuItemClick('/settings/users')}>
                  <ListItemIcon>
                    <GroupIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>User Management</ListItemText>
                </MenuItem>
              ]}
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;