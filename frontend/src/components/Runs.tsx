import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Box, Paper, Stack, Skeleton, Button, useTheme, CircularProgress } from '@mui/material';
import { CheckCircleOutline, PendingActionsOutlined, HourglassEmptyOutlined, AllInboxOutlined } from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useSnackbarContext } from '../components/SnackbarContext';
import { useUserStatus } from '../utils/useUserStatus'; // Correct import path
import { getRuns, updateRunStatus } from '../api/runs';
import { Run } from '../utils/types';
import { useNavigate } from 'react-router-dom';

// =================================================================
// 2. LOGIC HOOK
// =================================================================
const useManageRuns = () => {
    const [runs, setRuns] = useState<Run[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { handleOpenSnackbar } = useSnackbarContext();
    const { isAdmin, userCompanyId, isLoading: isUserStatusLoading } = useUserStatus(false);
    const navigate = useNavigate();

    const fetchAllRuns = useCallback(async () => {
        if (!userCompanyId) {
            handleOpenSnackbar('Company ID not available. Cannot fetch runs.', 'warning');
            setIsLoading(false);
            setRuns([]);
            return;
        }
        setIsLoading(true);
        try {
            const data = await getRuns(userCompanyId);
            setRuns(data);
        } catch (error) {
            console.error(error);
            handleOpenSnackbar('Failed to fetch runs.', 'error');
            setRuns([]);
        } finally {
            setIsLoading(false);
        }
    }, [userCompanyId, handleOpenSnackbar]);

    const handleChangeRunStatus = useCallback(async (runId: string, newStatus: Run['status']) => {
        try {
            await updateRunStatus(runId, newStatus);
            handleOpenSnackbar(`Run status updated to ${newStatus}.`, 'success');
            await fetchAllRuns();
        } catch (error) {
            console.error(error);
            handleOpenSnackbar('Failed to update run status.', 'error');
        }
    }, [handleOpenSnackbar, fetchAllRuns]);

    useEffect(() => {
        if (isUserStatusLoading) {
            return;
        }

        if (!isAdmin) {
            handleOpenSnackbar('You do not have permission to view this page.', 'error');
            navigate('/dashboard');
            return;
        }

        if (userCompanyId) {
            fetchAllRuns();
        }
    }, [isAdmin, userCompanyId, isUserStatusLoading, fetchAllRuns, handleOpenSnackbar, navigate]);

    return { runs, isLoading, isUserStatusLoading, isAdmin, handleChangeRunStatus };
};

// =================================================================
// 3. CHILD UI COMPONENTS
// =================================================================
const RunItem: React.FC<{ run: Run; onStatusChange: (_runId: string, _newStatus: Run['status']) => void; isAdmin: boolean }> = ({ run, onStatusChange, isAdmin }) => {
    const theme = useTheme();

    const statusColor = (status: Run['status']) => {
        switch (status) {
            case 'pending': return theme.palette.warning.main;
            case 'checking': return theme.palette.info.main;
            case 'finalised': return theme.palette.success.main;
            default: return theme.palette.text.secondary;
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                transition: 'box-shadow 0.3s',
                '&:hover': {
                    boxShadow: theme.shadows[4],
                }
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                    Run #{run.run_number}
                </Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize', color: statusColor(run.status), fontWeight: 'bold' }}>
                    Status: {run.status}
                </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary">
                Customer: {run.customername || 'N/A'} (Quote #{run.quoteid})
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Created: {new Date(run.created_at).toLocaleString()}
            </Typography>

            {isAdmin && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PendingActionsOutlined />}
                        onClick={() => onStatusChange(run.id, 'pending')}
                        disabled={run.status === 'pending'}
                    >
                        Set Pending
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<HourglassEmptyOutlined />}
                        onClick={() => onStatusChange(run.id, 'checking')}
                        disabled={run.status === 'checking'}
                    >
                        Set Checking
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircleOutline />}
                        onClick={() => onStatusChange(run.id, 'finalised')}
                        disabled={run.status === 'finalised'}
                    >
                        Finalise
                    </Button>
                </Box>
            )}
        </Paper>
    );
};

const EmptyRunsState: React.FC = () => (
    <Paper
        variant="outlined"
        sx={{
            mt: 4,
            p: { xs: 3, sm: 6 },
            textAlign: 'center',
            backgroundColor: (theme) => theme.palette.grey[50],
        }}
    >
        <Stack spacing={2} alignItems="center">
            <AllInboxOutlined sx={{ fontSize: 60, color: 'grey.400' }} />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                No runs found!
            </Typography>
            <Typography variant="body1" color="text.secondary">
                There are no picking runs available at the moment.
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Create a run from the dashboard by adding a quote.
            </Typography>
        </Stack>
    </Paper>
);

// =================================================================
// 4. MAIN EXPORTED COMPONENT
// =================================================================
const Runs: React.FC = () => {
    const { runs, isLoading, isUserStatusLoading, isAdmin, handleChangeRunStatus } = useManageRuns();

    const renderContent = () => {
        if (isUserStatusLoading || isLoading) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '60vh' }}>
                    <CircularProgress size={60} />
                </Box>
            );
        }

        // This check is important AFTER loading, to show the empty state
        if (runs.length === 0) {
            return <EmptyRunsState />;
        }

        return (
            <Stack spacing={2} sx={{ mt: 1 }}>
                {runs.map((run) => (
                    <RunItem
                        key={run.id}
                        run={run}
                        onStatusChange={handleChangeRunStatus}
                        isAdmin={isAdmin}
                    />
                ))}
            </Stack>
        );
    };

    // This block ensures immediate redirection if not admin, before rendering the main content
    if (isUserStatusLoading) {
        // Show a full-page loading indicator while checking user status
        return (
            <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, textAlign: 'center' }}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
                <Skeleton variant="text" width="60%" sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width="40%" sx={{ mx: 'auto' }} />
                <Stack spacing={2} sx={{ mt: 4 }}>
                    {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={120} />)}
                </Stack>
            </Container>
        );
    }

    if (!isAdmin) {
        return null; // The `useManageRuns` hook handles the snackbar and navigation for non-admins
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
            <Helmet>
                <title>Smart Picker | Manage Runs</title>
            </Helmet>
            <Stack spacing={{ xs: 3, sm: 4 }}>
                <Typography variant="h4" component="h1" fontWeight="bold" color='primary'>
                    Manage Picking Runs
                </Typography>

                <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, minHeight: 300 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        All Runs
                    </Typography>
                    {renderContent()}
                </Paper>
            </Stack>
        </Container>
    );
};

export default Runs;