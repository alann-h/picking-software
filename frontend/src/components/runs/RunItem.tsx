// src/components/runs/RunItem.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, GripVertical, Save, X } from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Run, RunQuote } from '../../utils/types';
import { updateRunQuotes, updateRunStatus, updateRunName } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';

// --- Helper Functions and Components ---

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

const EditableQuoteRow: React.FC<{ quote: RunQuote; onRemove: (quoteId: string) => void }> = ({ quote, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.quoteId });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center p-2 mb-1 bg-white border border-gray-200 rounded-md">
            <div {...attributes} {...listeners} className="cursor-grab touch-none mr-3 text-gray-500">
                <GripVertical className="w-5 h-5" />
            </div>
            <div className="flex-grow">
                <p className="text-sm font-medium text-gray-800">Quote #{quote.quoteNumber}</p>
                <p className="text-xs text-gray-500">{quote.customerName}</p>
            </div>
            <button className="text-red-500 hover:text-red-700 cursor-pointer" onClick={() => onRemove(quote.quoteId)}>
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
};


// --- Main RunItem Component ---

export const RunItem: React.FC<{
    run: Run;
    isAdmin: boolean;
    userCompanyId: string;
    onDeleteRun: (runId: string) => void;
}> = ({ run, isAdmin, userCompanyId, onDeleteRun }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editableQuotes, setEditableQuotes] = useState<RunQuote[]>([]);
    const [editableRunName, setEditableRunName] = useState(run.run_name || '');
    const [isExpanded, setIsExpanded] = useState(false);
    
    const queryClient = useQueryClient();
    const { handleOpenSnackbar } = useSnackbarContext();


    useEffect(() => {
        if (isEditing) {
            setEditableQuotes(run.quotes || []);
        }
    }, [isEditing, run.quotes]);

    const updateRunQuotesMutation = useMutation({
        mutationFn: ({ runId, orderedQuoteIds }: { runId: string, orderedQuoteIds: string[] }) => updateRunQuotes(runId, orderedQuoteIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
            handleOpenSnackbar('Run updated successfully!', 'success');
            setIsEditing(false);
        },
        onError: (error) => {
            handleOpenSnackbar('Failed to update run.', 'error');
            console.error(error);
        }
    });
    
    const updateStatusMutation = useMutation({
        mutationFn: ({ runId, newStatus }: { runId: string; newStatus: Run['status'] }) => updateRunStatus(runId, newStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
            handleOpenSnackbar('Run status updated.', 'success');
        },
        onError: () => {
            handleOpenSnackbar('Failed to update run status.', 'error');
        }
    });

    const updateRunNameMutation = useMutation({
        mutationFn: ({ runId, runName }: { runId: string; runName: string }) => updateRunName(runId, runName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
            handleOpenSnackbar('Run name updated.', 'success');
            setIsEditingName(false);
        },
        onError: () => {
            handleOpenSnackbar('Failed to update run name.', 'error');
        }
    });

    const { quoteCount } = useMemo(() => {
        const quotes = run.quotes || [];
        return {
            quoteCount: quotes.length,
        };
    }, [run.quotes]);

    const getStatusChipClasses = (status: Run['status']) => {
        switch (status) {
            case 'pending': return 'bg-blue-100 text-blue-800';
            case 'checking': return 'bg-yellow-100 text-yellow-800';
            case 'finalised': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleEditToggle = () => setIsEditing(!isEditing);
    const handleCancelEdit = () => setIsEditing(false);

    const handleRemoveQuote = (quoteIdToRemove: string) => {
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

    const handleSaveChanges = () => {
        const orderedQuoteIds = editableQuotes.map(q => q.quoteId);
        updateRunQuotesMutation.mutate({ runId: run.id, orderedQuoteIds });
    };

    const handleChangeRunStatus = (newStatus: Run['status']) => {
        updateStatusMutation.mutate({ runId: run.id, newStatus });
    };

    const handleEditNameToggle = () => {
        setIsEditingName(!isEditingName);
        setEditableRunName(run.run_name || '');
    };

    const handleSaveName = () => {
        if (editableRunName.trim()) {
            updateRunNameMutation.mutate({ runId: run.id, runName: editableRunName.trim() });
        } else {
            setIsEditingName(false);
        }
    };

    const handleCancelNameEdit = () => {
        setIsEditingName(false);
        setEditableRunName(run.run_name || '');
    };

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button 
                className="w-full flex justify-between items-center p-4 bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editableRunName}
                                    onChange={(e) => setEditableRunName(e.target.value)}
                                    className="text-lg font-semibold text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 w-full max-w-xs"
                                    placeholder="Enter run name"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={updateRunNameMutation.isPending}
                                    className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleCancelNameEdit}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {run.run_name ? `${run.run_name}` : `Run #${run.run_number}`}
                                </h3>
                                {isAdmin && (
                                    <button
                                        onClick={handleEditNameToggle}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                        {run.run_name && !isEditingName && (
                            <p className="text-sm text-gray-500">Run #{run.run_number}</p>
                        )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusChipClasses(run.status)}`}>
                        {run.status}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500">{quoteCount} quote(s)</p>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
                </div>
            </button>
  
            {isExpanded && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-md font-medium text-gray-700">Quotes in this Run</h4>
                            {isAdmin && run.status === 'pending' && !isEditing && (
                                <div className="flex space-x-2">
                                    <button onClick={handleEditToggle} className="flex items-center text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                                        <Edit className="w-4 h-4 mr-1" /> Edit
                                    </button>
                                    <button onClick={() => onDeleteRun(run.id)} className="flex items-center text-sm text-red-600 hover:text-red-800 cursor-pointer">
                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
  
                        {isEditing ? (
                            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                <SortableContext items={editableQuotes.map(q => q.quoteId)} strategy={verticalListSortingStrategy}>
                                    {editableQuotes.map(quote => (
                                        <EditableQuoteRow key={quote.quoteId} quote={quote} onRemove={handleRemoveQuote} />
                                    ))}
                                </SortableContext>
                                <div className="flex space-x-2 mt-4 justify-end">
                                    <button onClick={handleCancelEdit} className="flex items-center text-sm px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer">
                                        <X className="w-4 h-4 mr-1" /> Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveChanges}
                                        disabled={updateRunQuotesMutation.isPending}
                                        className="flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-4 h-4 mr-1" />
                                        {updateRunQuotesMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </DndContext>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote ID</th>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {run.quotes?.map((quote: RunQuote) => (
                                                <tr key={quote.quoteId}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">#{quote.quoteNumber}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{quote.customerName}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                                            quote.orderStatus === 'assigned' ? 'bg-blue-100 text-blue-800' : 
                                                            quote.orderStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                                                            quote.orderStatus === 'finalised' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {quote.orderStatus} 
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-700">{formatCurrency(quote.totalAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {isAdmin && (
                                    <div className="flex space-x-2 mt-4 justify-end">
                                        <button onClick={() => handleChangeRunStatus('pending')} disabled={run.status === 'pending' || updateStatusMutation.isPending} className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">Mark Pending</button>
                                        <button onClick={() => handleChangeRunStatus('finalised')} disabled={run.status === 'finalised' || updateStatusMutation.isPending} className="text-sm px-3 py-1.5 rounded-md border border-green-600 text-green-600 hover:bg-green-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">Mark Completed</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};