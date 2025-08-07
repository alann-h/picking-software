import React, { useState, useCallback } from 'react';
import { Container, Typography, Stack, Skeleton, Paper } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useUserStatus } from '../utils/useUserStatus';
import { useNavigate } from 'react-router-dom';
import { useSnackbarContext } from '../components/SnackbarContext';
import { CreateRun } from '../components/runs/CreateRun';
import { RunList } from '../components/runs/RunList';

const Runs: React.FC = () => {
    const { isAdmin, userCompanyId, isLoadingStatus: isUserStatusLoading } = useUserStatus(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const navigate = useNavigate();
    const { handleOpenSnackbar } = useSnackbarContext();

    const handleRunCreated = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);
    
    if (isUserStatusLoading) {
        return (
             <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
                 <Skeleton variant="text" width="40%" height={60} sx={{ mx: 'auto', mb: 3 }} />
                 <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2, mb: 4 }} />
                 <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Container>
        );
    }

    if (!isAdmin) {
        handleOpenSnackbar('You do not have permission to view this page.', 'error');
        navigate('/dashboard');
        return null;
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
            <Helmet>
                <title>Smart Picker | Manage Runs</title>
            </Helmet>
            <Stack spacing={{ xs: 3, sm: 4 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Typography variant="h4" component="h1" fontWeight="bold" color='primary'>
                        Manage Picking Runs
                    </Typography>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <CreateRun onRunCreated={handleRunCreated} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, minHeight: 300 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            All Runs
                        </Typography>
                        <RunList
                            userCompanyId={userCompanyId}
                            isAdmin={isAdmin}
                            refreshTrigger={refreshTrigger}
                        />
                    </Paper>
                </motion.div>
            </Stack>
        </Container>
    );
};

export default Runs;