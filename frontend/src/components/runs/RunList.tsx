import React, { useState, useOptimistic, useMemo, useEffect } from 'react';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
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


const RUNS_PER_PAGE = 10;

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
    const [currentPage, setCurrentPage] = useState(1);

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

    // Pagination calculations
    const { totalPages, paginatedRuns } = useMemo(() => {
        const total = Math.ceil(optimisticRuns.length / RUNS_PER_PAGE);
        const startIndex = (currentPage - 1) * RUNS_PER_PAGE;
        const endIndex = startIndex + RUNS_PER_PAGE;
        const paginated = optimisticRuns.slice(startIndex, endIndex);
        return { totalPages: total, paginatedRuns: paginated };
    }, [optimisticRuns, currentPage]);

    // Reset to page 1 if current page is out of bounds
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    if (optimisticRuns.length === 0) {
        return <EmptyRunsState />;
    }

    return (
        <>
            <div className="space-y-1.5 sm:space-y-2 mt-1 sm:mt-2">
                {paginatedRuns.map((run) => (
                    <RunItem
                        key={run.id}
                        run={run}
                        isAdmin={isAdmin}
                        userCompanyId={userCompanyId}
                        onDeleteRun={handleOpenDeleteDialog}
                    />
                ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 mt-3 sm:mt-4 px-2 sm:px-3 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                        <span className="font-medium">{((currentPage - 1) * RUNS_PER_PAGE) + 1}</span>-<span className="font-medium">{Math.min(currentPage * RUNS_PER_PAGE, optimisticRuns.length)}</span> of <span className="font-medium">{optimisticRuns.length}</span>
                    </p>
                    
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px] sm:min-w-[80px]"
                        >
                            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Previous</span>
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                // Show first, last, current, and nearby pages on mobile
                                let page;
                                if (totalPages <= 5) {
                                    page = i + 1;
                                } else if (currentPage <= 3) {
                                    page = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    page = totalPages - 4 + i;
                                } else {
                                    page = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md min-w-[32px] sm:min-w-[40px] ${
                                            currentPage === page
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px] sm:min-w-[80px]"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-1" />
                        </button>
                    </div>
                </div>
            )}
            
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