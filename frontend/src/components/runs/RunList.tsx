import React, { useState, useOptimistic } from 'react';
import { Paper, Typography, Stack } from '@mui/material';
import { AllInboxOutlined } from '@mui/icons-material';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Run } from '../../utils/types';
import { deleteRun, getRuns } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';
import { RunItem } from './RunItem';
import { ConfirmationDialog } from '../ConfirmationDialog';

const EmptyRunsState = () => (
    <Paper variant="outlined" sx={{ mt: 4, p: { xs: 3, sm: 6 }, textAlign: 'center', backgroundColor: (theme) => theme.palette.grey[50] }}>
        <Stack spacing={2} alignItems="center">
            <AllInboxOutlined sx={{ fontSize: 60, color: 'grey.400' }} />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>No runs found!</Typography>
            <Typography variant="body1" color="text.secondary">Create one above to get started.</Typography>
        </Stack>
    </Paper>
);


export const RunList: React.FC<{ userCompanyId: string; isAdmin: boolean; }> = ({ userCompanyId, isAdmin }) => {
    const queryClient = useQueryClient();
    const { handleOpenSnackbar } = useSnackbarContext();

    const { data: runs } = useSuspenseQuery<Run[]>({
        queryKey: ['runs', userCompanyId],
        queryFn: () => getRuns(userCompanyId),
    });

    const [optimisticRuns, deleteOptimisticRun] = useOptimistic(
        runs,
        (currentRuns, runIdToDelete: string) => {
            return currentRuns.filter(run => run.id !== runIdToDelete);
        }
    );

    const [dialogOpen, setDialogOpen] = useState(false);
    const [runIdToDelete, setRunIdToDelete] = useState<string | null>(null);

    const deleteRunMutation = useMutation({
        mutationFn: (runId: string) => deleteRun(runId),
        onMutate: async (runIdToDelete) => {
            await queryClient.cancelQueries({ queryKey: ['runs', userCompanyId] });
            deleteOptimisticRun(runIdToDelete);
            handleOpenSnackbar('Run deleted successfully.', 'success');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
            handleCloseDeleteDialog();
        },
        onError: () => {
            handleOpenSnackbar('Failed to delete run. Restoring.', 'error');
        }
    });

    const handleConfirmDelete = () => {
        if (!runIdToDelete) return;
        deleteRunMutation.mutate(runIdToDelete);
    };


    const handleOpenDeleteDialog = (runId: string) => {
      setRunIdToDelete(runId);
      setDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
      setRunIdToDelete(null);
      setDialogOpen(false);
    };

    if (optimisticRuns.length === 0) {
        return <EmptyRunsState />;
    }

    return (
        <>
            <Stack spacing={2} sx={{ mt: 2 }}>
                {optimisticRuns.map((run) => (
                    <RunItem
                        key={run.id}
                        run={run}
                        isAdmin={isAdmin}
                        userCompanyId={userCompanyId}
                        onDeleteRun={handleOpenDeleteDialog}
                    />
                ))}
            </Stack>
            
            <ConfirmationDialog
                open={dialogOpen}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Delete Run"
                message={`Are you sure you want to permanently delete this run? The quotes within it will be released. This action cannot be undone.`}
            />
        </>
    );
};