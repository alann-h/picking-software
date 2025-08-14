import React from 'react';
import { 
  Box, 
  Typography, 
  Stack,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import { 
  Group as GroupIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import UserManagement from '../UsersManagment';

const UsersTab: React.FC = () => {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Stack spacing={4}>
        {/* Header Section */}
        <Box>
          <Typography 
            variant="h4" 
            component="h2" 
            fontWeight="bold" 
            gutterBottom
            sx={{ color: 'primary.main' }}
          >
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user accounts, permissions, and access control for your organization.
          </Typography>
        </Box>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card 
            elevation={0}
            sx={{ 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)'
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    User Access Control
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Manage who has access to your Smart Picker system and what they can do.
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <GroupIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Add new users
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <SecurityIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Set admin privileges
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Management Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Box sx={{ maxWidth: '100%' }}>
            <UserManagement />
          </Box>
        </motion.div>
      </Stack>
    </motion.div>
  );
};

export default UsersTab;