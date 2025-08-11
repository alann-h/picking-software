import React, { useState, useMemo, useEffect } from 'react';
import { Paper, Typography, Stack, Divider, IconButton, Chip, Collapse, Box, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, CheckCircleOutline, PendingActionsOutlined, HourglassEmptyOutlined, Edit, Delete, DragIndicator, Save, Cancel } from '@mui/icons-material';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Run, RunQuote } from '../../utils/types';
import { updateRunQuotes } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';


// --- Helper Functions and Components ---

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

const EditableQuoteRow: React.FC<{ quote: RunQuote; onRemove: (quoteId: number) => void }> = ({ quote, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.quoteId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: 'white',
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as 'relative',
    };

    return (
        <Paper ref={setNodeRef} style={style} sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 1 }} variant="outlined">
            <Stack {...attributes} {...listeners} sx={{ cursor: 'grab', touchAction: 'none', mr: 1.5, color: 'text.secondary' }}>
                <DragIndicator />
            </Stack>
            <Stack flexGrow={1}>
                <Typography variant="body2" fontWeight={500}>Quote #{quote.quoteId}</Typography>
                <Typography variant="caption" color="text.secondary">{quote.customerName}</Typography>
            </Stack>
            <IconButton size="small" color="error" onClick={() => onRemove(quote.quoteId)}>
                <Delete />
            </IconButton>
        </Paper>
    );
};


// --- Main RunItem Component ---

export const RunItem: React.FC<{
    run: Run;
    isAdmin: boolean;
    onStatusChange: (runId: string, newStatus: Run['status']) => void;
    onDeleteRun: (runId: string) => void;
}> = ({ run, isAdmin, onStatusChange, onDeleteRun }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editableQuotes, setEditableQuotes] = useState<RunQuote[]>([]);
    const { handleOpenSnackbar } = useSnackbarContext();

    useEffect(() => {
        if (isEditing) {
            setEditableQuotes(run.quotes || []);
        }
    }, [isEditing, run.quotes]);

    const { quoteCount, totalValue } = useMemo(() => {
        const quotes = run.quotes || [];
        return {
            quoteCount: quotes.length,
            totalValue: quotes.reduce((sum, quote) => sum + (quote.totalAmount || 0), 0)
        };
    }, [run.quotes]);

    const getStatusChipColor = (status: Run['status']) => {
        switch (status) {
            case 'pending': return 'info';
            case 'checking': return 'warning';
            case 'finalised': return 'success';
            default: return 'default';
        }
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleEditToggle = () => setIsEditing(!isEditing);

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleRemoveQuote = (quoteIdToRemove: number) => {
        setEditableQuotes(prev => prev.filter(q => q.quoteId !== quoteIdToRemove));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setEditableQuotes((items) => {
                const oldIndex = items.findIndex((item) => item.quoteId === active.id);
                const newIndex = items.findIndex((item) => item.quoteId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSaveChanges = async () => {
        try {
            const orderedQuoteIds = editableQuotes.map(q => q.quoteId);
            await updateRunQuotes(run.id, orderedQuoteIds);
            handleOpenSnackbar('Run updated successfully!', 'success');
            onStatusChange(run.id, run.status);
            setIsEditing(false);
        } catch (error) {
            handleOpenSnackbar('Failed to update run.', 'error');
            console.error(error);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={3}>
                    <Typography variant="h6" fontWeight={600}>Run #{run.run_number}</Typography>
                    <Chip label={run.status} color={getStatusChipColor(run.status)} size="small" sx={{ textTransform: 'capitalize' }} />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Stack alignItems="flex-end">
                        <Typography variant="body1" fontWeight={500}>{formatCurrency(totalValue)}</Typography>
                        <Typography variant="caption" color="text.secondary">{quoteCount} quotes</Typography>
                    </Stack>
                    <IconButton onClick={() => setIsExpanded(!isExpanded)} size="small" aria-label="expand run">
                        {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </Stack>
            </Stack>

            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Typography variant="subtitle1" fontWeight={500}>Quotes in this Run</Typography>
                        {isAdmin && run.status === 'pending' && !isEditing && (
                            <Stack direction="row" spacing={1}>
                                <Button size="small" startIcon={<Edit />} onClick={handleEditToggle}>Edit</Button>
                                <Button size="small" startIcon={<Delete />} color="error" onClick={() => onDeleteRun(run.id)}>
                                    Delete
                                </Button>
                            </Stack>
                        )}
                    </Stack>

                    {/* --- CONDITIONAL RENDER: EDIT OR VIEW MODE --- */}
                    {isEditing ? (
                        // --- EDIT MODE ---
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <SortableContext items={editableQuotes.map(q => q.quoteId)} strategy={verticalListSortingStrategy}>
                                {editableQuotes.map(quote => (
                                    <EditableQuoteRow key={quote.quoteId} quote={quote} onRemove={handleRemoveQuote} />
                                ))}
                            </SortableContext>
                            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
                                <Button size="small" startIcon={<Cancel />} onClick={handleCancelEdit} color="inherit">Cancel</Button>
                                <Button size="small" variant="contained" startIcon={<Save />} onClick={handleSaveChanges}>Save Changes</Button>
                            </Stack>
                        </DndContext>
                    ) : (
                        // --- VIEW MODE ---
                        <>
                            <Table size="small" sx={{ mb: 2 }}>
                                <TableHead>
                                    <TableRow><TableCell>Quote ID</TableCell><TableCell>Customer Name</TableCell><TableCell align="right">Amount</TableCell></TableRow>
                                </TableHead>
                                <TableBody>
                                    {run.quotes?.map((quote: RunQuote) => (
                                        <TableRow key={quote.quoteId}><TableCell>#{quote.quoteId}</TableCell><TableCell>{quote.customerName}</TableCell><TableCell align="right">{formatCurrency(quote.totalAmount)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {isAdmin && (
                                <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
                                    <Button size="small" variant="outlined" onClick={() => onStatusChange(run.id, 'pending')} disabled={run.status === 'pending'}>Mark Pending</Button>
                                    <Button size="small" variant="outlined" onClick={() => onStatusChange(run.id, 'checking')} disabled={run.status === 'checking'}>Mark Checking</Button>
                                    <Button size="small" variant="outlined" color="success" onClick={() => onStatusChange(run.id, 'finalised')} disabled={run.status === 'finalised'}>Mark Completed</Button>
                                </Stack>
                            )}
                        </>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
};