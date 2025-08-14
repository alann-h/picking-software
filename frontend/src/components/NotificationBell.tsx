import React, { useState } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Clear as ClearIcon,
  NotificationsNone as NotificationsNoneIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNotificationContext } from './NotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import NotificationSettings from './NotificationSettings';

const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  try {
    const {
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAllNotifications,
    } = useNotificationContext();

    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleNotificationClick = (notification: any) => {
      markAsRead(notification.id);
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
      }
      handleClose();
    };

    const handleOpenSettings = () => {
      setSettingsOpen(true);
      handleClose();
    };

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'order_completed':
          return <CheckCircleIcon color="success" fontSize="small" />;
        case 'run_completed':
          return <PlaylistAddCheckIcon color="success" fontSize="small" />;
        case 'success':
          return <CheckCircleOutlineIcon color="success" fontSize="small" />;
        default:
          return <NotificationsIcon color="action" fontSize="small" />;
      }
    };

    const getNotificationColor = (type: string) => {
      switch (type) {
        case 'order_completed':
        case 'run_completed':
          return 'success';
        case 'error':
          return 'error';
        case 'warning':
          return 'warning';
        case 'info':
          return 'info';
        default:
          return 'default';
      }
    };

    const formatTimestamp = (timestamp: Date) => {
      try {
        return formatDistanceToNow(timestamp, { addSuffix: true });
      } catch {
        return 'Recently';
      }
    };

    return (
      <>
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{ position: 'relative' }}
          aria-label="notifications"
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsIcon color="action" />
          </Badge>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          slotProps={{
            paper: {
              sx: {
                width: isMobile ? '90vw' : 400,
                maxHeight: '70vh',
                mt: 1,
              },
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight="bold">
                Notifications
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={handleOpenSettings}
                  startIcon={<SettingsIcon />}
                  variant="outlined"
                >
                  Settings
                </Button>
                {unreadCount > 0 && (
                  <Button
                    size="small"
                    onClick={markAllAsRead}
                    startIcon={<CheckCircleOutlineIcon />}
                  >
                    Mark All Read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    size="small"
                    color="error"
                    onClick={clearAllNotifications}
                    startIcon={<ClearIcon />}
                  >
                    Clear All
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <NotificationsNoneIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No notifications yet
                </Typography>
              </Box>
            ) : (
              notifications.map((notification, index) => (
                <Box key={notification.id}>
                  <MenuItem
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      display: 'block',
                      p: 2,
                      backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getNotificationIcon(notification.type)}
                          <Typography
                            variant="subtitle2"
                            fontWeight={notification.isRead ? 400 : 600}
                            color={notification.isRead ? 'text.secondary' : 'text.primary'}
                          >
                            {notification.title}
                          </Typography>
                        </Stack>
                        <Chip
                          label={notification.type.replace('_', ' ')}
                          size="small"
                          color={getNotificationColor(notification.type) as any}
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Stack>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontWeight: notification.isRead ? 400 : 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {notification.message}
                      </Typography>

                      {notification.metadata && (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {notification.metadata.quoteId && (
                            <Chip
                              label={`Quote #${notification.metadata.quoteId}`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          )}
                          {notification.metadata.customerName && (
                            <Chip
                              label={notification.metadata.customerName}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          )}
                          {notification.metadata.totalAmount && (
                            <Chip
                              label={`$${notification.metadata.totalAmount.toFixed(2)}`}
                              size="small"
                              variant="outlined"
                              color="success"
                            />
                          )}
                        </Stack>
                      )}

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.disabled">
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                        
                        <Stack direction="row" spacing={0.5}>
                          {!notification.isRead && (
                            <Chip
                              label="New"
                              size="small"
                              color="error"
                              variant="filled"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            sx={{ p: 0.5 }}
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Stack>
                  </MenuItem>
                  
                  {index < notifications.length - 1 && <Divider />}
                </Box>
              ))
            )}
          </Box>
        </Menu>

        <NotificationSettings 
          open={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
      </>
    );
  } catch (error) {
    console.error('NotificationBell error:', error);
    // Fallback to simple icon if context fails
    return (
      <IconButton color="inherit" aria-label="notifications">
        <NotificationsIcon />
      </IconButton>
    );
  }
};

export default NotificationBell;
