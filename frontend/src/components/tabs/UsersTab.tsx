import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import UserManagement from '../UsersManagment';

const UsersTab: React.FC = () => (
  <Box sx={{ maxWidth: '100%' }}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <UserManagement />
    </motion.div>
  </Box>
);

export default UsersTab;