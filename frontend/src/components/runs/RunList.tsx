import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography, Stack, Skeleton } from '@mui/material';
import { AllInboxOutlined } from '@mui/icons-material';
import { Run } from '../../utils/types';
import { deleteRun, getRuns, updateRunStatus } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';
import { RunItem } from './RunItem';
import { ConfirmationDialog } from '../ConfirmationDialog';


// Internal Hook for managing the list of runs
const useRunList = (userCompanyId: string | null, refreshTrigger: number) => {
    const [runs, setRuns] = useState<Run[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const { handleOpenSnackbar } = useSnackbarContext();
    
    const fetchAllRuns = useCallback(async () => {
        if (!userCompanyId) return;
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

    useEffect(() => {
        if (userCompanyId) {
            fetchAllRuns();
        }
    }, [userCompanyId, fetchAllRuns, refreshTrigger]);

    const handleChangeRunStatus = useCallback(async (runId: string, newStatus: Run['status']) => {
        try {
            await updateRunStatus(runId, newStatus);
            
            setRuns(prevRuns =>
              prevRuns.map(run =>
                run.id === runId
                  ? { ...run, status: newStatus }
                  : run
              )
          );

            handleOpenSnackbar(`Run status updated to ${newStatus}.`, 'success');

        } catch (error) {
            console.error(error);
            handleOpenSnackbar('Failed to update run status.', 'error');
        }
    }, [handleOpenSnackbar]);

    return { runs, setRuns, isLoading, handleChangeRunStatus };
};

// Internal UI for empty state
const EmptyRunsState = () => (
    <Paper variant="outlined" sx={{ mt: 4, p: { xs: 3, sm: 6 }, textAlign: 'center', backgroundColor: (theme) => theme.palette.grey[50] }}>
        <Stack spacing={2} alignItems="center">
            <AllInboxOutlined sx={{ fontSize: 60, color: 'grey.400' }} />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>No runs found!</Typography>
            <Typography variant="body1" color="text.secondary">Create one above to get started.</Typography>
        </Stack>
    </Paper>
);

// Main Exported Component
export const RunList: React.FC<{ userCompanyId: string | null; isAdmin: boolean; refreshTrigger: number }> = ({ userCompanyId, isAdmin, refreshTrigger }) => {
    const { runs, setRuns, isLoading, handleChangeRunStatus } = useRunList(userCompanyId, refreshTrigger);

    const { handleOpenSnackbar } = useSnackbarContext();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [runIdToDelete, setRunIdToDelete] = useState<string | null>(null);

    const handleOpenDeleteDialog = (runId: string) => {
      setRunIdToDelete(runId);
      setDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
      setRunIdToDelete(null);
      setDialogOpen(false);
    };

    const handleConfirmDelete = async () => {
      if (!runIdToDelete) return;

      try {
        await deleteRun(runIdToDelete);
        setRuns(prevRuns => prevRuns.filter(run => run.id !== runIdToDelete));
        handleOpenSnackbar('Run deleted successfully.', 'success');
      } catch (error) {
          console.error(error);
          handleOpenSnackbar('Failed to delete run.', 'error');
      } finally {
          handleCloseDeleteDialog();
      }
    };

    if (isLoading) {
        return (
            <Stack spacing={2} sx={{ mt: 2 }}>
                {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={120} />)}
            </Stack>
        );
    }

    if (runs.length === 0) {
        return <EmptyRunsState />;
    }

    return (
        <>
            <Stack spacing={2} sx={{ mt: 2 }}>
                {runs.map((run) => (
                    <RunItem
                        key={run.id}
                        run={run}
                        onStatusChange={handleChangeRunStatus}
                        onDeleteRun={handleOpenDeleteDialog}
                        isAdmin={isAdmin}
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