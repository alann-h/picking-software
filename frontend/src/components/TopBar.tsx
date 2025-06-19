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
import { useNavigate } from 'react-router-dom';
import { useUserStatus } from '../utils/useUserStatus';

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
      color="transparent"
      elevation={0}
      sx={{
        background: 'linear-gradient(to right, #ece9e6, #ffffff)',
        borderBottom: '1px solid #dce0d7',
      }}
    >
      <Toolbar
        sx={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 1 : 0,
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
            }}
          >
            {isAdmin && (
              isMobile ? (
                <Tooltip title="Orders to Check">
                  <span>
                    <IconButton
                      color="inherit"
                      onClick={() => navigate('/orders-to-check')}
                    >
                      <AssignmentIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : (
                <Button
                  startIcon={<AssignmentIcon />}
                  onClick={() => navigate('/orders-to-check')}
                  sx={{ marginRight: 1 }}
                >
                  Orders to Check
                </Button>
              )
            )}

            <Tooltip title="Settings">
              <span>
                <IconButton
                  color="inherit"
                  onClick={() => navigate('/settings')}
                  disabled={!isAdmin}
                >
                  <SettingsIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
