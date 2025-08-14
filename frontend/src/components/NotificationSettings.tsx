import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Divider,
  Box,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNotificationContext } from './NotificationContext';

interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const [settings, setSettings] = useState({
    soundEnabled: true,
    orderNotifications: true,
    runNotifications: true,
    successNotifications: true,
    errorNotifications: true,
    infoNotifications: true,
    warningNotifications: true,
  });

  const handleSettingChange = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      soundEnabled: true,
      orderNotifications: true,
      runNotifications: true,
      successNotifications: true,
      errorNotifications: true,
      infoNotifications: true,
      warningNotifications: true,
    };
    setSettings(defaultSettings);
  };

  // Load settings from localStorage on mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse saved notification settings:', error);
      }
    }
  }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon color="primary" />
        Notification Settings
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info" icon={<NotificationsIcon />}>
            Configure your notification preferences for different types of events.
          </Alert>

          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VolumeUpIcon color="primary" />
              Sound & Audio
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.soundEnabled}
                  onChange={() => handleSettingChange('soundEnabled')}
                  color="primary"
                />
              }
              label="Enable notification sounds"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
              Play audio feedback when notifications appear
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>
              Order Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.orderNotifications}
                  onChange={() => handleSettingChange('orderNotifications')}
                  color="success"
                />
              }
              label="Order completion notifications"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
              Get notified when quotes are finalized and sent to QuickBooks
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Run Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.runNotifications}
                  onChange={() => handleSettingChange('runNotifications')}
                  color="success"
                />
              }
              label="Run completion notifications"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
              Get notified when picking runs are marked as completed
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" gutterBottom>
              General Notifications
            </Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.successNotifications}
                    onChange={() => handleSettingChange('successNotifications')}
                    color="success"
                  />
                }
                label="Success notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.errorNotifications}
                    onChange={() => handleSettingChange('errorNotifications')}
                    color="error"
                  />
                }
                label="Error notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.infoNotifications}
                    onChange={() => handleSettingChange('infoNotifications')}
                    color="info"
                  />
                }
                label="Info notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.warningNotifications}
                    onChange={() => handleSettingChange('warningNotifications')}
                    color="warning"
                  />
                }
                label="Warning notifications"
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleReset} color="inherit">
          Reset to Defaults
        </Button>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationSettings;
