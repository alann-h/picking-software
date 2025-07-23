import React from 'react';
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
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'; // Import new icon
import { useNavigate } from 'react-router-dom';
import { useUserStatus } from '../utils/useUserStatus'; // Import useUserStatus

interface TopBarProps {
  disableTopBar: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ disableTopBar }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAdmin } = useUserStatus(disableTopBar);

  const handleTitleClick = () => {
    navigate(disableTopBar ? '/' : '/dashboard');
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
            {isAdmin && ( // Only show Orders to Check and Manage Runs to admins
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

                {/* New Runs Tab/Button - Only for Admins */}
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
                    onClick={() => navigate('/runs')}
                    variant="text"
                  >
                    Manage Runs
                  </Button>
                )}
              </>
            )}

            <Tooltip title="Settings">
              <IconButton
                onClick={() => navigate('/settings')}
                disabled={!isAdmin} // Settings button is disabled for non-admins
                aria-label="settings"
                sx={{ color: theme.palette.text.primary }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;