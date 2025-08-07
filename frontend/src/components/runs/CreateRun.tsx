import React, { useState, useCallback, useEffect } from 'react';
import { Paper, Typography, Grid, Autocomplete, TextField, Box, Stack, Skeleton, Button, CircularProgress, IconButton, Tooltip, useTheme, Chip } from '@mui/material';
import { AddCircleOutline, PlaylistAdd, Delete, DragIndicator, InboxOutlined, CalendarTodayOutlined } from '@mui/icons-material';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { Customer, QuoteSummary } from '../../utils/types';
import { getCustomers } from '../../api/customers';
import { getCustomerQuotes } from '../../api/quote';
import { createRunFromQuotes } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';
import { useUserStatus } from '../../utils/useUserStatus';
import { useSearchParams } from 'react-router-dom';

// --- TYPES ---

interface RunBuilder {
  id: string; // A unique string id like 'run-builder-1'
  quotes: QuoteSummary[];
}

// --- CUSTOM HOOK ---

const RUN_BUILDER_STORAGE_KEY = 'runBuilderState';

const useRunPlanner = (onRunsCreated: () => void) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [availableQuotes, setAvailableQuotes] = useState<QuoteSummary[]>([]);
    const [isCustomerLoading, setIsCustomerLoading] = useState(true);
    const [isQuotesLoading, setIsQuotesLoading] = useState(false);

    // Load Initial State from localStorage
    const [stagedQuotes, setStagedQuotes] = useState<QuoteSummary[]>(() => {
        try {
            const savedState = window.localStorage.getItem(RUN_BUILDER_STORAGE_KEY);
            return savedState ? JSON.parse(savedState).stagedQuotes : [];
        } catch (error) {
            return [];
        }
    });

    const [runsToCreate, setRunsToCreate] = useState<RunBuilder[]>(() => {
        try {
            const savedState = window.localStorage.getItem(RUN_BUILDER_STORAGE_KEY);
            return savedState ? JSON.parse(savedState).runsToCreate : [];
        } catch (error) {
            return [];
        }
    });

    const [activeDraggedItem, setActiveDraggedItem] = useState<QuoteSummary | null>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);

    const { handleOpenSnackbar } = useSnackbarContext();
    const { userCompanyId } = useUserStatus(false);

    // Save State to localStorage whenever it changes
    useEffect(() => {
        const stateToSave = { stagedQuotes, runsToCreate };
        window.localStorage.setItem(RUN_BUILDER_STORAGE_KEY, JSON.stringify(stateToSave));
    }, [stagedQuotes, runsToCreate]);

    // Data Fetching
    useEffect(() => {
        const fetchCustomers = async () => {
            setIsCustomerLoading(true);
            try {
                const data = await getCustomers();
                setCustomers(data);
            } catch (error) {
                console.error(error);
                handleOpenSnackbar('Failed to fetch customers.', 'error');
            } finally {
                setIsCustomerLoading(false);
            }
        };
        fetchCustomers();
    }, [handleOpenSnackbar]);

    const handleCustomerChange = useCallback((_: React.SyntheticEvent | null, customer: Customer | null) => {
        if (customer) {
            setSearchParams({ customerId: String(customer.customerId) }, { replace: true });
        } else {
            setSearchParams({}, { replace: true });
        }
    }, [setSearchParams]);

    useEffect(() => {
        const customerIdFromUrl = searchParams.get('customerId');
        const customerFromUrl = customerIdFromUrl && customers.length > 0
            ? customers.find(c => String(c.customerId) === customerIdFromUrl) || null
            : null;

        setSelectedCustomer(customerFromUrl);

        const fetchOrClearQuotes = async () => {
            if (customerFromUrl) {
                setIsQuotesLoading(true);
                setAvailableQuotes([]);
                try {
                    const data: QuoteSummary[] = await getCustomerQuotes(customerFromUrl.customerId);
                    const quotesWithCustomerId = data.map(quote => ({ ...quote, customerId: customerFromUrl.customerId }));
                    const allUsedQuoteIds = new Set([...stagedQuotes.map(q => q.id), ...runsToCreate.flatMap(r => r.quotes.map(q => q.id))]);
                    setAvailableQuotes(quotesWithCustomerId.filter(q => !allUsedQuoteIds.has(q.id)));
                } catch (error) {
                    console.error(error);
                    handleOpenSnackbar('Failed to fetch quotes.', 'error');
                } finally {
                    setIsQuotesLoading(false);
                }
            } else {
                setAvailableQuotes([]);
            }
        };

        fetchOrClearQuotes();
    }, [searchParams, customers, stagedQuotes, runsToCreate, handleOpenSnackbar]);

    useEffect(() => {
        const customerIdFromUrl = searchParams.get('customerId');
        if (customerIdFromUrl && customers.length > 0) {
            const customerFromUrl = customers.find(c => String(c.customerId) === customerIdFromUrl);
            if (customerFromUrl && customerFromUrl.customerId !== selectedCustomer?.customerId) {
                handleCustomerChange(null, customerFromUrl);
            }
        }
    }, [customers, searchParams, selectedCustomer, handleCustomerChange]);

    // UI Actions
    const handleStageQuote = (quote: QuoteSummary) => {
        setStagedQuotes(prev => [quote, ...prev]);
        setAvailableQuotes(prev => prev.filter(q => q.id !== quote.id));
    };
    
    const handleUnstageQuote = (quoteId: number) => {
        const quoteToUnstage = stagedQuotes.find(q => q.id === quoteId);
        if (!quoteToUnstage) return;

        setStagedQuotes(prev => prev.filter(q => q.id !== quoteId));

        if (selectedCustomer && quoteToUnstage.customerId === selectedCustomer.customerId) {
            setAvailableQuotes(prev => [quoteToUnstage, ...prev]);
        }
    };

    const handleAddNewRun = () => setRunsToCreate(prev => [...prev, { id: `run-builder-${Date.now()}`, quotes: [] }]);

    const handleRemoveRun = (runId: string) => {
        const runToRemove = runsToCreate.find(r => r.id === runId);
        if (!runToRemove) return;
        setStagedQuotes(prev => [...runToRemove.quotes, ...prev]);
        setRunsToCreate(prev => prev.filter(r => r.id !== runId));
    };

    // Drag and Drop Handlers
    const handleDragStart = (event: any) => {
      const { active } = event;
      const allQuotes = [...stagedQuotes, ...runsToCreate.flatMap(r => r.quotes)];
      const currentItem = allQuotes.find(q => q.id === active.id);
      if (currentItem) {
          setActiveDraggedItem(currentItem);
      }
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
            setStagedQuotes(items => {
              const oldIndex = items.findIndex(item => item.id === active.id);
              return arrayMove(items, oldIndex, overIndex);
          });
          } else {
              setRunsToCreate(runs => runs.map(run => {
                  if (run.id === sourceContainerId) {
                      const oldIndex = run.quotes.findIndex(item => item.id === active.id);
                      return { ...run, quotes: arrayMove(run.quotes, oldIndex, overIndex) };
                  }
                  return run;
              }));
          }
      } else {
          let draggedItem: QuoteSummary | undefined;
          let nextStagedQuotes = [...stagedQuotes];
          let nextRunsToCreate = runsToCreate.map(r => ({ ...r, quotes: [...r.quotes] }));

          if (sourceContainerId === 'staged-quotes') {
              const itemIndex = nextStagedQuotes.findIndex(q => q.id === active.id);
              if (itemIndex > -1) [draggedItem] = nextStagedQuotes.splice(itemIndex, 1);
          } else {
              const sourceRun = nextRunsToCreate.find(r => r.id === sourceContainerId);
              if (sourceRun) {
                  const itemIndex = sourceRun.quotes.findIndex(q => q.id === active.id);
                  if (itemIndex > -1) [draggedItem] = sourceRun.quotes.splice(itemIndex, 1);
              }
          }
          
          if (!draggedItem) return;

          if (destContainerId === 'staged-quotes') {
              nextStagedQuotes.push(draggedItem);
          } else {
              const destRun = nextRunsToCreate.find(r => r.id === destContainerId);
              if (destRun) {
                  const overIndex = over.data.current?.sortable?.index ?? destRun.quotes.length;
                  destRun.quotes.splice(overIndex, 0, draggedItem);
              }
          }

          setStagedQuotes(nextStagedQuotes);
          setRunsToCreate(nextRunsToCreate);
    }
  };
    
    // Finalize Logic
    const handleFinalizeRuns = async () => {
        if (!userCompanyId) return;
        const validRuns = runsToCreate.filter(r => r.quotes.length > 0);
        if (validRuns.length === 0) {
            handleOpenSnackbar('No runs to create.', 'warning');
            return;
        }
        setIsFinalizing(true);
        try {
            const creationPromises = validRuns.map(run => createRunFromQuotes(run.quotes.map(q => q.id), userCompanyId));
            await Promise.all(creationPromises);
            handleOpenSnackbar(`${validRuns.length} run(s) created successfully!`, 'success');
            
            window.localStorage.removeItem(RUN_BUILDER_STORAGE_KEY);
            setRunsToCreate([]);
            setStagedQuotes([]);
            onRunsCreated();
        } catch (error: any) {
            handleOpenSnackbar(error.message || 'Failed to create one or more runs.', 'error');
        } finally {
            setIsFinalizing(false);
        }
    };

    return {
        customers, selectedCustomer, availableQuotes, isCustomerLoading, isQuotesLoading,
        stagedQuotes, runsToCreate, activeDraggedItem, isFinalizing,
        handleCustomerChange, handleStageQuote, handleAddNewRun, handleRemoveRun, handleDragStart, handleDragEnd, handleFinalizeRuns,
        handleUnstageQuote
    };
};

// --- UI COMPONENTS ---

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
                <Chip size="small" label={`$${(quote.totalAmt || 0).toFixed(2)}`} color="success" variant="outlined" />
                <Stack direction="row" alignItems="center" spacing={0.5}><CalendarTodayOutlined sx={{fontSize: 14}}/> <Typography variant="caption">{quote.lastUpdatedTime ? new Date(quote.lastUpdatedTime).toLocaleDateString() : 'N/A'}</Typography></Stack>
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

// --- MAIN COMPONENT ---

export const CreateRun: React.FC<{ onRunCreated: () => void }> = ({ onRunCreated }) => {
    const planner = useRunPlanner(onRunCreated);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    return (
        <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>Step 1: Find & Stage Quotes</Typography>
                <Grid container spacing={3} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="subtitle1" fontWeight={500} gutterBottom>Select a Customer</Typography>
                        <Autocomplete options={planner.customers} getOptionLabel={(o) => o.customerName || ''} value={planner.selectedCustomer} onChange={planner.handleCustomerChange} loading={planner.isCustomerLoading} renderInput={(params) => <TextField {...params} placeholder="Search by customer name..." />} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Typography variant="subtitle1" fontWeight={500} gutterBottom>Available Quotes</Typography>
                        <Box sx={{ height: 250, display: 'flex', flexDirection: 'column' }}>
                            {planner.isQuotesLoading ? (
                                <Skeleton variant="rectangular" width="100%" height="100%" sx={{borderRadius: 1}} />
                            ) : (
                                <Paper variant="outlined" sx={{ flexGrow: 1, p: 1, overflowY: 'auto', bgcolor: 'grey.50' }}>
                                    {planner.availableQuotes.length > 0 ? (
                                        planner.availableQuotes.map(q => <QuoteFinderItem key={q.id} quote={q} onStage={() => planner.handleStageQuote(q)} />)
                                    ) : (
                                        <EmptyState text={planner.selectedCustomer ? "No available quotes found for this customer." : "Select a customer to see their quotes."} />
                                    )}
                                </Paper>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                 <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" component="h2" fontWeight={600}>Step 2: Build Picking Runs</Typography>
                    <Button variant="contained" onClick={planner.handleFinalizeRuns} disabled={planner.isFinalizing || planner.runsToCreate.filter(r => r.quotes.length > 0).length === 0} startIcon={planner.isFinalizing ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutline />}>Create Runs</Button>
                </Stack>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={planner.handleDragStart} onDragEnd={planner.handleDragEnd}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom color="text.secondary">Staging Pool ({planner.stagedQuotes.length})</Typography>
                            <Paper sx={{ height: 450, p: 1, bgcolor: 'grey.100', overflowY: 'auto' }}>
                                <SortableContext id="staged-quotes" items={planner.stagedQuotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                    {planner.stagedQuotes.length > 0 ? planner.stagedQuotes.map(q => <DraggableQuoteCard key={q.id} quote={q} onRemove={planner.handleUnstageQuote} />) : <EmptyState text="Add quotes from the list above to stage them for a run." />}
                                </SortableContext>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom color="text.secondary">Run Columns</Typography>
                                <Button onClick={planner.handleAddNewRun} startIcon={<AddCircleOutline />}>Add New Run</Button>
                            </Stack>
                            <Paper variant="outlined" sx={{ display: 'flex', overflowX: 'auto', p: 2, minHeight: 442, bgcolor: 'grey.100'}}>
                                {planner.runsToCreate.length > 0 ? (
                                    <Stack direction="row" spacing={2} sx={{minHeight: 410}}>
                                        {planner.runsToCreate.map((run, index) => (
                                            <RunColumn key={run.id} run={run} index={index} onRemove={planner.handleRemoveRun} />
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
                            {planner.activeDraggedItem ? <DraggableQuoteCard quote={planner.activeDraggedItem} /> : null}
                        </DragOverlay>,
                        document.body
                    )}
                </DndContext>
            </Paper>
        </Stack>
    );
};
