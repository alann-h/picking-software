import React, { Suspense } from 'react';
import {
  Container,
  Typography,
  Stack,
  Paper,
  Box,
  Alert,
  AlertTitle
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSnackbarContext } from './SnackbarContext';
import { CreateRun } from './runs/CreateRun';
import { RunList } from './runs/RunList';
import { CreateRunSkeleton, RunListSkeleton } from './Skeletons';
import { useAuth } from './hooks/useAuth';

const Runs: React.FC = () => {
  const { isAdmin, userCompanyId } = useAuth();
  const navigate = useNavigate();
  const { handleOpenSnackbar } = useSnackbarContext();

  // Redirect non-admin users
  if (!isAdmin) {
    React.useEffect(() => {
      handleOpenSnackbar('You do not have permission to view this page.', 'error');
      navigate('/dashboard');
    }, []);
    return null;
  }

  // Redirect users without company association
  if (!userCompanyId) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
        <Alert
          severity="warning"
          sx={{
            borderRadius: 2,
            '& .MuiAlert-icon': { fontSize: 28 }
          }}
        >
          <AlertTitle sx={{ fontWeight: 600, mb: 1 }}>
            Company Association Required
          </AlertTitle>
          You are not currently associated with a company. Please contact your administrator to set up your company profile.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 4 } }}>
      <title>Smart Picker | Manage Runs</title>

      <Stack spacing={{ xs: 4, sm: 5 }}>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography
              variant="h3"
              component="h1"
              fontWeight="bold"
              color="primary"
              sx={{
                mb: 1,
                background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Manage Picking Runs
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontWeight: 400 }}
            >
              Create, organize, and track your warehouse picking operations
            </Typography>
          </Box>
        </motion.div>

        {/* Create Run Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)'
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                p: { xs: 2, sm: 3 }
              }}
            >
              <Typography variant="h5" fontWeight="600">
                Create New Run
              </Typography>
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Suspense fallback={<CreateRunSkeleton />}>
                <CreateRun />
              </Suspense>
            </Box>
          </Paper>
        </motion.div>

        {/* Run List Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden',
              minHeight: 400
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                color: 'white',
                p: { xs: 2, sm: 3 }
              }}
            >
              <Typography variant="h5" fontWeight="600">
                Active & Completed Runs
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Monitor progress and manage your picking operations
              </Typography>
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Suspense fallback={<RunListSkeleton />}>
                <RunList
                  userCompanyId={userCompanyId}
                  isAdmin={isAdmin}
                />
              </Suspense>
            </Box>
          </Paper>
        </motion.div>
      </Stack>
    </Container>
  );
};

export default Runs;