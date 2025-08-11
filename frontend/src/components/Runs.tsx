import React, { Suspense } from 'react';
import { Container, Typography, Stack, Skeleton, Paper, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSnackbarContext } from '../components/SnackbarContext';
import { CreateRun } from '../components/runs/CreateRun';
import { RunList } from '../components/runs/RunList';
import { CreateRunSkeleton, RunListSkeleton } from './Skeletons'
import { useAuth } from './hooks/useAuth';

const Runs: React.FC = () => {
    const { isAdmin, userCompanyId } = useAuth();
    const navigate = useNavigate();
    const { handleOpenSnackbar } = useSnackbarContext();

    if (!isAdmin) {
        handleOpenSnackbar('You do not have permission to view this page.', 'error');
        navigate('/dashboard');
        return null;
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
            <title>Smart Picker | Manage Runs</title>
            <Stack spacing={{ xs: 3, sm: 4 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Typography variant="h4" component="h1" fontWeight="bold" color='primary'>
                        Manage Picking Runs
                    </Typography>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    <Suspense fallback={<CreateRunSkeleton />}>
                        <CreateRun />
                    </Suspense>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, minHeight: 300 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            All Runs
                        </Typography>
                        <Suspense fallback={<RunListSkeleton />}>
                          {userCompanyId ? (
                              <RunList
                                userCompanyId={userCompanyId}
                                isAdmin={isAdmin}
                              />
                          ) : (
                              <Typography sx={{ mt: 2 }} color="text.secondary">
                                  User is not associated with a company.
                              </Typography>
                          )}
                        </Suspense>

                    </Paper>
                </motion.div>
            </Stack>
        </Container>
    );
};

export default Runs;