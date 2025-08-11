import React, { useState, useMemo, Suspense, useTransition } from 'react';
import { Paper, Typography, Grid, Autocomplete, TextField, Box, Stack, Button, CircularProgress, IconButton, Tooltip, useTheme, Chip } from '@mui/material';
import { AddCircleOutline, PlaylistAdd, Delete, DragIndicator, InboxOutlined, CalendarTodayOutlined } from '@mui/icons-material';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Customer, QuoteSummary } from '../../utils/types';
import { getCustomers } from '../../api/customers';
import { getCustomerQuotes } from '../../api/quote';
import { createRunFromQuotes } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';
import { useSearchParams } from 'react-router-dom';
import { AvailableQuotesSkeleton } from '../Skeletons'
import { useAuth } from '../hooks/useAuth';

// --- UI COMPONENTS --- (These remain the same and are omitted for brevity)
const EmptyState = ({ text, sx = {} }: { text: string, sx?: object }) => (
    <Stack justifyContent="center" alignItems="center" sx={{ height: '100%', p: 2, color: 'text.secondary', textAlign: 'center', ...sx }}>
        <InboxOutlined sx={{ fontSize: 48, mb: 1.5, color: 'grey.400' }} />
        <Typography variant="body2">{text}</Typography>
    </Stack>
);

const QuoteFinderItem: React.FC<{ quote: QuoteSummary, onStage: () => void }> = ({ quote, onStage }) => (
    <Paper variant='outlined' sx={{ p: 1.5, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s', '&:hover': { borderColor: 'primary.main', boxShadow: (theme) => theme.shadows[1] } }}>
        <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight="bold">Quote #{quote.id}</Typography>
            <Stack direction="row" spacing={2} color="text.secondary">
                <Chip size="small" label={`$${(quote.totalAmount || 0).toFixed(2)}`} color="success" variant="outlined" />
                <Stack direction="row" alignItems="center" spacing={0.5}><CalendarTodayOutlined sx={{fontSize: 14}}/> <Typography variant="caption">{quote.lastModified ? new Date(quote.lastModified).toLocaleDateString() : 'N/A'}</Typography></Stack>
            </Stack>
        </Stack>
        <Tooltip title="Add to Staging Pool"><IconButton onClick={onStage} size="small" color="primary"><PlaylistAdd /></IconButton></Tooltip>
    </Paper>
);

const DraggableQuoteCard: React.FC<{ quote: QuoteSummary, onRemove?: (id: number) => void }> = ({ quote, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id });
    const theme = useTheme();
    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        boxShadow: isDragging ? theme.shadows[8] : theme.shadows[1],
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <Paper ref={setNodeRef} style={style} variant='elevation' sx={{ p: 1.5, mb: 1, userSelect: 'none', display: 'flex', alignItems: 'center', bgcolor: 'background.paper' }}>
            <Box {...attributes} {...listeners} sx={{ cursor: 'grab', pr: 1.5, color: 'text.secondary', touchAction: 'none' }}><DragIndicator /></Box>
            <Stack sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">Quote #{quote.id}</Typography>
                <Typography variant="caption" color="text.secondary">{quote.customerName}</Typography>
            </Stack>
            {onRemove && (
                <Tooltip title="Remove from Staging">
                    <IconButton size="small" onClick={() => onRemove(quote.id)}>
                        <Delete />
                    </IconButton>
                </Tooltip>
            )}
        </Paper>
    );
};

const RunColumn: React.FC<{ run: RunBuilder, index: number, onRemove: (id: string) => void }> = ({ run, index, onRemove }) => {
    const { setNodeRef } = useDroppable({ id: run.id });

    return (
        <Paper sx={{ minWidth: 280, width: 280, p: 1.5, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight="bold">New Run {index + 1}</Typography>
                <Tooltip title="Delete Run"><IconButton size="small" onClick={() => onRemove(run.id)}><Delete /></IconButton></Tooltip>
            </Stack>
            <SortableContext id={run.id} items={run.quotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <Box ref={setNodeRef} sx={{ flexGrow: 1, bgcolor: 'grey.50', borderRadius: 1, p: 1, overflowY: 'auto' }}>
                    {run.quotes.length > 0 ? (
                        run.quotes.map(q => <DraggableQuoteCard key={q.id} quote={q} />)
                    ) : (
                        <EmptyState sx={{ p: 1, height: '100%' }} text="Drag quotes here." />
                    )}
                </Box>
            </SortableContext>
        </Paper>
    );
};
interface RunBuilder {
  id: string;
  quotes: QuoteSummary[];
}


const AvailableQuotes: React.FC<{ customer: Customer, stagedQuoteIds: Set<number>, onStageQuote: (quote: QuoteSummary) => void }> = ({ customer, stagedQuoteIds, onStageQuote }) => {

    const { data: quotesData } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId],
        queryFn: () => getCustomerQuotes(customer.customerId),
    });

    const availableQuotes = quotesData
        .filter(q => !stagedQuoteIds.has(q.id))
        .map(quote => ({ ...quote, customerId: customer.customerId }));

    return (
        <Paper variant="outlined" sx={{ flexGrow: 1, p: 1, overflowY: 'auto', bgcolor: 'grey.50' }}>
            {availableQuotes.length > 0 ? (
                availableQuotes.map(q => <QuoteFinderItem key={q.id} quote={q} onStage={() => onStageQuote(q)} />)
            ) : (
                <EmptyState text="No available quotes found for this customer." />
            )}
        </Paper>
    );
};
// --- MAIN COMPONENT ---
export const CreateRun: React.FC<{}> = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleOpenSnackbar } = useSnackbarContext();
    const { userCompanyId } = useAuth();

    const [isPending, startTransition] = useTransition();

    const [stagedQuotes, setStagedQuotes] = useState<QuoteSummary[]>([]);
    const [runsToCreate, setRunsToCreate] = useState<RunBuilder[]>([]);
    const [activeDraggedItem, setActiveDraggedItem] = useState<QuoteSummary | null>(null);

    const { data: customers } = useSuspenseQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers,
    });

    const selectedCustomer = useMemo(() => {
        const customerId = searchParams.get('customerId');
        return customers?.find(c => String(c.customerId) === customerId) || null;
    }, [customers, searchParams]);

    const handleCustomerChange = (_: React.SyntheticEvent | null, customer: Customer | null) => {
        startTransition(() => {
            setSearchParams(customer ? { customerId: String(customer.customerId) } : {});
        });
    };

    const stagedQuoteIds = useMemo(() => new Set(stagedQuotes.map(q => q.id)), [stagedQuotes]);
    const createRunMutation = useMutation({
        mutationFn: (quoteIds: number[]) => createRunFromQuotes(quoteIds, userCompanyId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs'] });
            setRunsToCreate([]);
            setStagedQuotes([]);
            handleOpenSnackbar(`${createRunMutation.variables?.length} run(s) created successfully!`, 'success');
        },
        onError: (error: any) => {
            handleOpenSnackbar(error.message || 'Failed to create one or more runs.', 'error');
        }
    });

    const handleFinalizeRuns = async () => {
        if (!userCompanyId) return;
        const validRuns = runsToCreate.filter(r => r.quotes.length > 0);
        if (validRuns.length === 0) {
            handleOpenSnackbar('No runs to create.', 'warning');
            return;
        }
        const creationPromises = validRuns.map(run =>
            createRunMutation.mutateAsync(run.quotes.map(q => q.id))
        );
        try {
            await Promise.all(creationPromises);
        } catch {
            // Errors are handled by the mutation's onError callback
        }
    };
    
    const handleStageQuote = (quote: QuoteSummary) => {
        setStagedQuotes(prev => [quote, ...prev]);
    };
    const handleUnstageQuote = (quoteId: number) => {
        const quoteToUnstage = stagedQuotes.find(q => q.id === quoteId);
        if (!quoteToUnstage) return;
        setStagedQuotes(prev => prev.filter(q => q.id !== quoteId));
    };
    const handleAddNewRun = () => setRunsToCreate(prev => [...prev, { id: `run-builder-${Date.now()}`, quotes: [] }]);
    const handleRemoveRun = (runId: string) => {
        const runToRemove = runsToCreate.find(r => r.id === runId);
        if (!runToRemove) return;
        setStagedQuotes(prev => [...runToRemove.quotes, ...prev]);
        setRunsToCreate(prev => prev.filter(r => r.id !== runId));
    };
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const handleDragStart = (event: any) => {
      const { active } = event;
      const allQuotes = [...stagedQuotes, ...runsToCreate.flatMap(r => r.quotes)];
      const currentItem = allQuotes.find(q => q.id === active.id);
      if (currentItem) setActiveDraggedItem(currentItem);
    };
    const handleDragEnd = (event: DragEndEvent) => {
      setActiveDraggedItem(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const sourceContainerId = active.data.current?.sortable.containerId;
      const destContainerId = over.data.current?.sortable.containerId || over.id;
      if (!sourceContainerId || !destContainerId) return;
      if (sourceContainerId === destContainerId) {
          const overIndex = over.data.current?.sortable.index;
          if (overIndex === undefined) return;
          if (sourceContainerId === 'staged-quotes') {
            setStagedQuotes(items => arrayMove(items, items.findIndex(i => i.id === active.id), overIndex));
          } else {
              setRunsToCreate(runs => runs.map(run => (run.id === sourceContainerId)
                  ? { ...run, quotes: arrayMove(run.quotes, run.quotes.findIndex(i => i.id === active.id), overIndex) }
                  : run
              ));
          }
      } else {
          let draggedItem: QuoteSummary | undefined;
          let nextStagedQuotes = [...stagedQuotes];
          let nextRunsToCreate = runsToCreate.map(r => ({ ...r, quotes: [...r.quotes] }));

          if (sourceContainerId === 'staged-quotes') {
              [draggedItem] = nextStagedQuotes.splice(nextStagedQuotes.findIndex(q => q.id === active.id), 1);
          } else {
              const sourceRun = nextRunsToCreate.find(r => r.id === sourceContainerId);
              if (sourceRun) [draggedItem] = sourceRun.quotes.splice(sourceRun.quotes.findIndex(q => q.id === active.id), 1);
          }

          if (!draggedItem) return;

          if (destContainerId === 'staged-quotes') {
              nextStagedQuotes.push(draggedItem);
          } else {
              const destRun = nextRunsToCreate.find(r => r.id === destContainerId);
              if (destRun) {
                  destRun.quotes.splice(over.data.current?.sortable?.index ?? destRun.quotes.length, 0, draggedItem);
              }
          }
          setStagedQuotes(nextStagedQuotes);
          setRunsToCreate(nextRunsToCreate);
      }
    };

    return (
        <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>Step 1: Find & Stage Quotes</Typography>
                <Grid container spacing={3} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="subtitle1" fontWeight={500} gutterBottom>Select a Customer</Typography>
                        <Autocomplete
                            options={customers}
                            getOptionLabel={(o) => o.customerName || ''}
                            value={selectedCustomer}
                            onChange={handleCustomerChange}
                            isOptionEqualToValue={(option, value) => option.customerId === value.customerId}
                            renderInput={(params) => <TextField {...params} placeholder="Search by customer name..." />}
                        />
                    </Grid>
                    <Grid  size={{ xs: 12, md: 7 }}>
                        <Typography variant="subtitle1" fontWeight={500} gutterBottom>Available Quotes</Typography>
                        <Box sx={{ height: 250, display: 'flex', flexDirection: 'column' }}>
                            {isPending ? (
                                <AvailableQuotesSkeleton />
                            ) : (
                                <Suspense fallback={<AvailableQuotesSkeleton />}>
                                    {selectedCustomer ? (
                                        <AvailableQuotes
                                            key={selectedCustomer.customerId}
                                            customer={selectedCustomer}
                                            stagedQuoteIds={stagedQuoteIds}
                                            onStageQuote={handleStageQuote}
                                        />
                                    ) : (
                                        <EmptyState text="Select a customer to see their quotes." />
                                    )}
                                </Suspense>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="h2" fontWeight={600}>Step 2: Build Picking Runs</Typography>
                    <Button
                        variant="contained"
                        onClick={handleFinalizeRuns}
                        disabled={createRunMutation.isPending}
                        startIcon={createRunMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutline />}
                    >
                        Create Runs
                    </Button>
                </Stack>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom color="text.secondary">Staging Pool ({stagedQuotes.length})</Typography>
                            <Paper sx={{ height: 450, p: 1, bgcolor: 'grey.100', overflowY: 'auto' }}>
                                <SortableContext id="staged-quotes" items={stagedQuotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                    {stagedQuotes.length > 0 ? stagedQuotes.map(q => <DraggableQuoteCard key={q.id} quote={q} onRemove={handleUnstageQuote} />) : <EmptyState text="Add quotes from the list above to stage them for a run." />}
                                </SortableContext>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="text.secondary">Run Columns</Typography>
                                <Button onClick={handleAddNewRun} startIcon={<AddCircleOutline />}>Add New Run</Button>
                            </Stack>
                            <Paper variant="outlined" sx={{ display: 'flex', overflowX: 'auto', p: 2, minHeight: 442, bgcolor: 'grey.100'}}>
                                {runsToCreate.length > 0 ? (
                                    <Stack direction="row" spacing={2} sx={{minHeight: 410}}>
                                        {runsToCreate.map((run, index) => (
                                            <RunColumn key={run.id} run={run} index={index} onRemove={handleRemoveRun} />
                                        ))}
                                    </Stack>
                                ) : (
                                    <EmptyState text="Click 'Add New Run' to create your first run column." sx={{ width: '100%' }}/>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                    {createPortal(
                        <DragOverlay>
                            {activeDraggedItem ? <DraggableQuoteCard quote={activeDraggedItem} /> : null}
                        </DragOverlay>,
                        document.body
                    )}
                </DndContext>
            </Paper>
        </Stack>
    );
};