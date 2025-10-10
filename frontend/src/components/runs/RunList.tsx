import React, { useState, useOptimistic } from 'react';
import { Inbox } from 'lucide-react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Run } from '../../utils/types';
import { deleteRun, getRuns } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';
import { RunItem } from './RunItem';
import { ConfirmationDialog } from '../ConfirmationDialog';

const EmptyRunsState = () => (
    <div className="mt-4 text-center border-2 border-dashed border-gray-200 rounded-lg p-6 sm:p-12 bg-gray-50">
        <div className="flex flex-col items-center space-y-2">
            <Inbox className="w-16 h-16 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-800">No runs found!</h3>
            <p className="text-sm text-gray-500">Create one above to get started.</p>
        </div>
    </div>
);


export const RunList: React.FC<{ userCompanyId: string; isAdmin: boolean; }> = ({ userCompanyId, isAdmin }) => {
    const queryClient = useQueryClient();
    const { handleOpenSnackbar } = useSnackbarContext();

    const { data: runs } = useSuspenseQuery<Run[]>({
        queryKey: ['runs', userCompanyId],
        queryFn: () => getRuns(userCompanyId),
        refetchInterval: 20000,
        refetchIntervalInBackground: false,
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
        },
        onError: () => {
            handleOpenSnackbar('Failed to delete run. Restoring.', 'error');
        }
    });

    const handleConfirmDelete = () => {
        if (!runIdToDelete) return;
        deleteRunMutation.mutate(runIdToDelete);
        handleCloseDeleteDialog();
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
            <div className="space-y-2 mt-2">
                {optimisticRuns.map((run) => (
                    <RunItem
                        key={run.id}
                        run={run}
                        isAdmin={isAdmin}
                        userCompanyId={userCompanyId}
                        onDeleteRun={handleOpenDeleteDialog}
                    />
                ))}
            </div>
            
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