import React from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  PlaylistAddCheck as PlaylistAddCheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNotificationContext } from './NotificationContext';

const NotificationDemo: React.FC = () => {
  const theme = useTheme();
  const {
    addNotification,
    notifyOrderCompleted,
    notifyRunCompleted,
  } = useNotificationContext();

  const handleTestOrderNotification = () => {
    notifyOrderCompleted(12345, 'Acme Corporation', 1250.75);
  };

  const handleTestRunNotification = () => {
    notifyRunCompleted('run-123', 5, ['Acme Corp', 'Tech Solutions', 'Global Industries']);
  };

  const handleTestSuccessNotification = () => {
    addNotification({
      title: 'Success! 🎉',
      message: 'This is a test success notification to demonstrate the system.',
      type: 'success',
      severity: 'success',
    });
  };

  const handleTestErrorNotification = () => {
    addNotification({
      title: 'Error Occurred! ❌',
      message: 'This is a test error notification to demonstrate the system.',
      type: 'error',
      severity: 'error',
    });
  };

  const handleTestWarningNotification = () => {
    addNotification({
      title: 'Warning! ⚠️',
      message: 'This is a test warning notification to demonstrate the system.',
      type: 'warning',
      severity: 'warning',
    });
  };

  const handleTestInfoNotification = () => {
    addNotification({
      title: 'Information ℹ️',
      message: 'This is a test info notification to demonstrate the system.',
      type: 'info',
      severity: 'info',
    });
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        m: 2, 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack spacing={3}>
        <Box sx={{ textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Notification System Demo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Test different types of notifications to see how they work
          </Typography>
        </Box>

        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600} color="primary">
            Business Notifications
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleTestOrderNotification}
              sx={{ minWidth: 200 }}
            >
              Test Order Completion
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<PlaylistAddCheckIcon />}
              onClick={handleTestRunNotification}
              sx={{ minWidth: 200 }}
            >
              Test Run Completion
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={600} color="primary">
            General Notifications
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="outlined"
              color="success"
              onClick={handleTestSuccessNotification}
              sx={{ minWidth: 150 }}
            >
              Success
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleTestErrorNotification}
              sx={{ minWidth: 150 }}
            >
              Error
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleTestWarningNotification}
              sx={{ minWidth: 150 }}
            >
              Warning
            </Button>
            <Button
              variant="outlined"
              color="info"
              onClick={handleTestInfoNotification}
              sx={{ minWidth: 150 }}
            >
              Info
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper', 
          borderRadius: 2, 
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            💡 Click the notification bell in the top bar to view all notifications
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};

export default NotificationDemo;
