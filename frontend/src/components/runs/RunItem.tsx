import React from 'react';
import { Paper, Stack, Typography, Button, Box, useTheme } from '@mui/material';
import { CheckCircleOutline, PendingActionsOutlined, HourglassEmptyOutlined } from '@mui/icons-material';
import { Run } from '../../utils/types';

interface RunItemProps {
    run: Run;
    onStatusChange: (runId: string, newStatus: Run['status']) => void;
    isAdmin: boolean;
}

export const RunItem: React.FC<RunItemProps> = ({ run, onStatusChange, isAdmin }) => {
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
                '&:hover': { boxShadow: theme.shadows[4] }
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
                        variant="outlined" size="small" startIcon={<PendingActionsOutlined />}
                        onClick={() => onStatusChange(run.id, 'pending')}
                        disabled={run.status === 'pending'}
                    >
                        Set Pending
                    </Button>
                    <Button
                        variant="outlined" size="small" startIcon={<HourglassEmptyOutlined />}
                        onClick={() => onStatusChange(run.id, 'checking')}
                        disabled={run.status === 'checking'}
                    >
                        Set Checking
                    </Button>
                    <Button
                        variant="contained" size="small" startIcon={<CheckCircleOutline />}
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