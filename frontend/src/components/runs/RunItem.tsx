// src/components/runs/RunItem.tsx

import React, { useState, useMemo, useEffect, useOptimistic } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Edit, Trash2, GripVertical, Save, X, Plus, Search, Users, Printer } from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { Run, RunQuote, QuoteSummary, Customer } from '../../utils/types';
import { updateRunQuotes, updateRunStatus, updateRunName } from '../../api/runs';
import { getQuotesWithStatus, getCustomerQuotes } from '../../api/quote';
import { getCustomers } from '../../api/customers';
import { useSnackbarContext } from '../SnackbarContext';
import PortalDropdown from '../PortalDropdown';

// --- Helper Functions and Components ---

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

const CustomerQuotesSkeleton: React.FC = () => (
    <div className="bg-white rounded-lg p-3 max-h-60 overflow-y-auto border border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-2">Loading quotes...</p>
        {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200 mb-2 animate-pulse">
                <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-1 ml-auto"></div>
                    <div className="h-4 bg-gray-200 rounded w-4 ml-auto"></div>
                </div>
            </div>
        ))}
    </div>
);

const EditableQuoteRow: React.FC<{ 
    quote: RunQuote; 
    onRemove: (quoteId: string) => void; 
    isLoading: boolean;
    onNavigate: (quoteId: string) => void;
}> = ({ quote, onRemove, isLoading, onNavigate }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.quoteId });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : (isLoading ? 0.5 : 1),
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center p-1.5 sm:p-2 mb-1 bg-white border border-gray-200 rounded-md">
            <div {...attributes} {...listeners} className="cursor-grab touch-none mr-2 text-gray-500 flex-shrink-0">
                <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div 
                className={`flex-grow rounded px-1.5 py-1 -mx-1.5 -my-1 min-w-0 ${isLoading ? 'cursor-wait' : 'cursor-pointer hover:bg-gray-50'}`}
                onClick={() => onNavigate(quote.quoteId)}
            >
                <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 truncate">#{quote.quoteNumber || quote.quoteId}</p>
                    {isLoading && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 flex-shrink-0"></div>
                    )}
                </div>
                <p className="text-xs text-gray-500 truncate">{quote.customerName}</p>
            </div>
            <button className="text-red-500 hover:text-red-700 cursor-pointer flex-shrink-0 p-1" onClick={() => onRemove(quote.quoteId)}>
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editableQuotes, setEditableQuotes] = useState<RunQuote[]>([]);
    const [editableRunName, setEditableRunName] = useState(run.run_name || '');
    
    // Get expanded run ID from URL
    const expandedRunId = searchParams.get('expandedRun');
    const isExpanded = expandedRunId === run.id;
    const [showAddQuotes, setShowAddQuotes] = useState(false);
    
    // Function to toggle expansion via URL
    const toggleExpanded = () => {
        const newParams = new URLSearchParams(searchParams);
        if (isExpanded) {
            newParams.delete('expandedRun');
        } else {
            newParams.set('expandedRun', run.id);
        }
        setSearchParams(newParams);
    };
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [customerQuery, setCustomerQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);
    const customerTriggerRef = React.useRef<HTMLDivElement>(null);
    
    const queryClient = useQueryClient();
    const { handleOpenSnackbar } = useSnackbarContext();
    
    // Optimistic state for run status
    const [optimisticStatus, setOptimisticStatus] = useOptimistic(run.status);
    
    // Optimistic state for run name
    const [optimisticRunName, setOptimisticRunName] = useOptimistic(run.run_name || '');
    
    // Fetch available quotes when editing (quotes already in DB)
    const { data: availableQuotes } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', 'pending', userCompanyId],
        queryFn: async () => {
            const response = await getQuotesWithStatus('pending') as QuoteSummary[];
            return response;
        },
    });

    // Fetch customers for search
    const { data: customers } = useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers as () => Promise<Customer[]>,
        enabled: isEditing, // Fetch when editing (needed for URL restoration)
    });

    // Fetch quotes for selected customer from accounting system (and local DB to get all statuses)
    const { data: customerQuotesData, isLoading: isLoadingCustomerQuotes } = useQuery<QuoteSummary[]>({
        queryKey: ['quotes', selectedCustomer?.customerId, 'combined'],
        queryFn: async () => {
            if (!selectedCustomer) return [];
            
            const [remoteQuotes, localQuotes] = await Promise.all([
                getCustomerQuotes(selectedCustomer.customerId) as Promise<QuoteSummary[]>,
                getQuotesWithStatus('all') as Promise<QuoteSummary[]>
            ]);

            const combined = new Map<string, QuoteSummary>();

            // Add remote quotes first
            remoteQuotes.forEach(q => {
                 const id = String(q.id);
                 combined.set(id, { ...q, id, customerId: selectedCustomer.customerId });
            });

            // Add/Overwrite with local quotes (to get checking/completed statuses)
            localQuotes.forEach(q => {
                if (q.customerId === selectedCustomer.customerId) {
                    const id = String(q.id);
                    combined.set(id, q);
                }
            });

            return Array.from(combined.values());
        },
        enabled: !!selectedCustomer && isEditing, // Only fetch when customer is selected
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 10 * 60 * 1000,
    });

    const filteredCustomers = useMemo(() => {
        if (!customers) return [];
        if (customerQuery === '') return customers;
        return customers.filter((customer: Customer) =>
            customer.customerName
                .toLowerCase()
                .replace(/\s+/g, '')
                .includes(customerQuery.toLowerCase().replace(/\s+/g, ''))
        );
    }, [customers, customerQuery]);


    // Initialize state from URL params on mount
    useEffect(() => {
        const editingRunId = searchParams.get('editing');
        const customerId = searchParams.get('customerId');
        
        // If URL says we should be editing this run
        if (editingRunId === run.id) {
            setIsEditing(true);
            
            // Ensure the run is expanded when editing
            if (!isExpanded) {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('expandedRun', run.id);
                setSearchParams(newParams);
            }
            
            // If there's a customer ID in URL, restore customer selection
            if (customerId && customers) {
                const customer = customers.find(c => c.customerId === customerId);
                if (customer) {
                    setSelectedCustomer(customer);
                    setShowCustomerSearch(true);
                }
            }
        }
    }, [searchParams, run.id, customers, isExpanded, setSearchParams]);

    useEffect(() => {
        if (isEditing) {
            setEditableQuotes(run.quotes || []);
        } else {
            // Reset customer search when exiting edit mode
            setShowCustomerSearch(false);
            setSelectedCustomer(null);
            setCustomerQuery('');
        }
    }, [isEditing, run.quotes]);

    const updateRunQuotesMutation = useMutation({
        mutationFn: ({ runId, orderedQuoteIds }: { runId: string, orderedQuoteIds: string[] }) => updateRunQuotes(runId, orderedQuoteIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
            handleOpenSnackbar('Run updated successfully!', 'success');
            setIsEditing(false);
            // Clear URL params after successful save
            setSearchParams({});
        },
        onError: (error) => {
            // Format the error message to be more user-friendly
            let errorMessage = error instanceof Error ? error.message : 'Failed to update run.';
            
            // Check if this is a detailed error with multiple quote issues
            if (errorMessage.includes('Details:')) {
                const parts = errorMessage.split('Details:');
                const summary = parts[0].trim();
                const details = parts[1]?.trim() || '';
                
                // Format the detailed errors with line breaks for better readability
                const formattedDetails = details
                    .split(';')
                    .map(detail => detail.trim())
                    .filter(detail => detail.length > 0)
                    .map(detail => `• ${detail}`)
                    .join('\n');
                
                errorMessage = `${summary}\n\n${formattedDetails}`;
            }
            
            handleOpenSnackbar(errorMessage, 'error');
            console.error(error);
        }
    });
    
    const updateStatusMutation = useMutation({
        mutationFn: async ({ runId, newStatus }: { runId: string; newStatus: Run['status'] }) => {
            // Set optimistic state immediately
            setOptimisticStatus(newStatus);
            return updateRunStatus(runId, newStatus);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
            handleOpenSnackbar('Run status updated.', 'success');
        },
        onError: () => {
            handleOpenSnackbar('Failed to update run status.', 'error');
            // Optimistic state will automatically revert on error
        }
    });

    const updateRunNameMutation = useMutation({
        mutationFn: async ({ runId, runName }: { runId: string; runName: string }) => {
            // Set optimistic state immediately
            setOptimisticRunName(runName);
            setIsEditingName(false);
            return updateRunName(runId, runName);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
            handleOpenSnackbar('Run name updated.', 'success');
        },
        onError: (error) => {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update run name.';
            handleOpenSnackbar(errorMessage, 'error');
            setIsEditingName(true);
            // Optimistic state will automatically revert on error
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
            case 'completed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        // Add editing state to URL
        if (!isEditing) {
            setSearchParams({ editing: run.id });
        } else {
            setSearchParams({});
        }
    };
    
    const handleCancelEdit = () => {
        setIsEditing(false);
        // Clear URL params when canceling
        setSearchParams({});
    };

    const handleRemoveQuote = (quoteIdToRemove: string) => {
        setEditableQuotes(prev => prev.filter(q => q.quoteId !== quoteIdToRemove));
    };
    
    const handleAddQuote = (quote: QuoteSummary) => {
        // Check if quote already exists in the run (match by ID or quote number)
        const isDuplicate = editableQuotes.some(q => 
            q.quoteId === quote.id || 
            (q.quoteNumber && quote.quoteNumber && q.quoteNumber === quote.quoteNumber)
        );
        if (isDuplicate) {
            handleOpenSnackbar(`Quote #${quote.quoteNumber || quote.id} is already in this run`, 'warning');
            return;
        }

        const newQuote: RunQuote = {
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            customerName: quote.customerName,
            totalAmount: quote.totalAmount,
            priority: editableQuotes.length + 1,
            orderStatus: quote.orderStatus,
        };
        setEditableQuotes(prev => [...prev, newQuote]);
        handleOpenSnackbar(`Added ${quote.customerName} - #${quote.quoteNumber || quote.id}`, 'success');
    };

    const handleCustomerChange = (customer: Customer | null) => {
        setSelectedCustomer(customer);
        setCustomerQuery('');
        setIsCustomerDropdownOpen(false);
        
        // Update URL with customer selection
        if (customer) {
            setSearchParams({ editing: run.id, customerId: customer.customerId });
        } else {
            setSearchParams({ editing: run.id });
        }
    };
    
    const handleQuoteNavigate = (quoteId: string) => {
        setLoadingQuoteId(quoteId);
        navigate(`/quote?id=${quoteId}`);
    };
    
    // Filter out quotes that are already in the run (from DB pending quotes)
    const quotesNotInRun = useMemo(() => {
        const currentQuoteIds = new Set(editableQuotes.map(q => q.quoteId));
        const currentQuoteNumbers = new Set(editableQuotes.map(q => q.quoteNumber).filter(Boolean));
        
        return (availableQuotes || []).filter((q: QuoteSummary) => 
            !currentQuoteIds.has(q.id) && !currentQuoteNumbers.has(q.quoteNumber)
        );
    }, [availableQuotes, editableQuotes]);

    const customerQuotesNotInRun = useMemo(() => {
        const currentQuoteIds = new Set(editableQuotes.map(q => q.quoteId));
        const currentQuoteNumbers = new Set(editableQuotes.map(q => q.quoteNumber).filter(Boolean));
        
        return (customerQuotesData || []).filter((q: QuoteSummary) => 
            !currentQuoteIds.has(q.id) && !currentQuoteNumbers.has(q.quoteNumber)
        );
    }, [customerQuotesData, editableQuotes]);

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
        // Convert all quote IDs to strings to ensure consistent data type
        const orderedQuoteIds = editableQuotes.map(q => String(q.quoteId));
        updateRunQuotesMutation.mutate({ runId: run.id, orderedQuoteIds });
        // Clear URL params when saving (will be cleared in onSuccess too, but good to do here)
        setSearchParams({});
    };

    const handleChangeRunStatus = (newStatus: Run['status']) => {
        updateStatusMutation.mutate({ runId: run.id, newStatus });
    };

    const MAX_RUN_NAME_LENGTH = 100;

    const handleEditNameToggle = () => {
        setIsEditingName(!isEditingName);
        setEditableRunName(optimisticRunName || run.run_name || '');
    };

    const handleSaveName = () => {
        const trimmedName = editableRunName.trim();
        
        if (!trimmedName) {
            setIsEditingName(false);
            return;
        }
        
        if (trimmedName.length > MAX_RUN_NAME_LENGTH) {
            handleOpenSnackbar(`Run name is too long. Maximum ${MAX_RUN_NAME_LENGTH} characters allowed.`, 'error');
            return;
        }
        
        updateRunNameMutation.mutate({ runId: run.id, runName: trimmedName });
    };

    const handleCancelNameEdit = () => {
        setIsEditingName(false);
        setEditableRunName(optimisticRunName || run.run_name || '');
    };

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div 
                className="w-full flex justify-between items-center p-2 sm:p-3 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer"
                onClick={toggleExpanded}
            >
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                        {isEditingName ? (
                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={editableRunName}
                                        onChange={(e) => setEditableRunName(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        maxLength={MAX_RUN_NAME_LENGTH}
                                        className="text-sm sm:text-base font-semibold text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 w-full"
                                        placeholder="Enter run name"
                                        autoFocus
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveName();
                                        }}
                                        disabled={updateRunNameMutation.isPending}
                                        className="text-green-600 hover:text-green-800 disabled:opacity-50 flex-shrink-0 p-1"
                                    >
                                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelNameEdit();
                                        }}
                                        className="text-red-600 hover:text-red-800 flex-shrink-0 p-1"
                                    >
                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                                <span className={`text-xs ${
                                    editableRunName.length === 0 ? 'text-gray-500' :
                                    editableRunName.length > MAX_RUN_NAME_LENGTH * 0.9 ? 'text-amber-600' : 
                                    'text-green-600'
                                }`}>
                                    {editableRunName.length}/{MAX_RUN_NAME_LENGTH} characters
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                                    {optimisticRunName ? `${optimisticRunName}` : `Run #${run.run_number}`}
                                </h3>
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditNameToggle();
                                        }}
                                        className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
                                    >
                                        <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                        {optimisticRunName && !isEditingName && (
                            <p className="text-xs text-gray-500">Run #{run.run_number}</p>
                        )}
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap flex-shrink-0 ${getStatusChipClasses(optimisticStatus)}`}>
                        {optimisticStatus}
                    </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                    <p className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">{quoteCount} quote{quoteCount !== 1 ? 's' : ''}</p>
                    {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
                </div>
            </div>
  
            {isExpanded && (
                <div className="p-2 sm:p-3 bg-gray-50 border-t border-gray-200">
                    <div>
                        <div className="flex justify-between items-center mb-2 sm:mb-3">
                            <h4 className="text-sm sm:text-base font-medium text-gray-700">Quotes in this Run</h4>
                            <div className="flex gap-1.5 sm:gap-2">
                                <button 
                                    onClick={() => navigate(`/runs/print/${run.id}`)}
                                    className="flex items-center text-xs sm:text-sm text-gray-600 hover:text-gray-800 cursor-pointer px-2 py-1 rounded hover:bg-gray-100"
                                >
                                    <Printer className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" /> <span className="hidden sm:inline">Print Run</span>
                                </button>
                                {isAdmin && optimisticStatus === 'pending' && !isEditing && (
                                    <>
                                        <button onClick={handleEditToggle} className="flex items-center text-xs sm:text-sm text-blue-600 hover:text-blue-800 cursor-pointer px-2 py-1 rounded hover:bg-blue-50">
                                            <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" /> <span className="hidden sm:inline">Edit</span>
                                        </button>
                                        <button onClick={() => onDeleteRun(run.id)} className="flex items-center text-xs sm:text-sm text-red-600 hover:text-red-800 cursor-pointer px-2 py-1 rounded hover:bg-red-50">
                                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
  
                        {isEditing ? (
                            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                <SortableContext items={editableQuotes.map(q => q.quoteId)} strategy={verticalListSortingStrategy}>
                                    {editableQuotes.map(quote => (
                                        <EditableQuoteRow 
                                            key={quote.quoteId} 
                                            quote={quote} 
                                            onRemove={handleRemoveQuote} 
                                            isLoading={loadingQuoteId === quote.quoteId}
                                            onNavigate={handleQuoteNavigate}
                                        />
                                    ))}
                                </SortableContext>
                                
                                {/* Add Quotes from Database */}
                                {quotesNotInRun.length > 0 && (
                                    <div className="mt-2 sm:mt-3 border-t border-gray-200 pt-2 sm:pt-3">
                                        <button
                                            onClick={() => setShowAddQuotes(!showAddQuotes)}
                                            className="flex items-center text-xs sm:text-sm text-blue-600 hover:text-blue-800 cursor-pointer mb-2 px-2 py-1 rounded hover:bg-blue-50"
                                        >
                                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                            {showAddQuotes ? 'Hide Pending Quotes' : `Add Pending Quotes (${quotesNotInRun.length})`}
                                        </button>
                                        
                                        {showAddQuotes && (
                                            <div className="bg-gray-50 rounded-lg p-2 sm:p-3 max-h-60 overflow-y-auto">
                                                <p className="text-xs text-gray-500 mb-2">Quotes in database with status &apos;pending&apos;:</p>
                                                {quotesNotInRun.map((quote: QuoteSummary) => (
                                                    <div
                                                        key={quote.id}
                                                        onClick={() => handleAddQuote(quote)}
                                                        className="flex justify-between items-center p-2 bg-white rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer mb-1.5 transition-colors"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">#{quote.quoteNumber || quote.id}</p>
                                                            <p className="text-xs text-gray-600 truncate">{quote.customerName}</p>
                                                        </div>
                                                        <div className="text-right flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                            <p className="text-xs sm:text-sm font-semibold text-green-700">{formatCurrency(quote.totalAmount)}</p>
                                                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Add Quotes from Customer Search (QuickBooks/Xero) */}
                                <div className="mt-2 sm:mt-3 border-t border-gray-200 pt-2 sm:pt-3">
                                    <button
                                        onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                                        className="flex items-center text-xs sm:text-sm text-green-600 hover:text-green-800 cursor-pointer mb-2 px-2 py-1 rounded hover:bg-green-50"
                                    >
                                        <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                        {showCustomerSearch ? 'Hide Customer Search' : 'Search Customer Quotes'}
                                    </button>
                                    
                                    {showCustomerSearch && (
                                        <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                                            <p className="text-xs text-gray-600 mb-2">Search customers and add quotes from your accounting system:</p>
                                            
                                            {/* Customer Search Dropdown */}
                                            <div ref={customerTriggerRef} className="relative mb-2">
                                                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                                    <Users className="pointer-events-none absolute top-2 sm:top-2.5 left-2 sm:left-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                                                    <input
                                                        className="w-full border-none py-1.5 sm:py-2 pl-8 sm:pl-10 pr-10 sm:pr-16 text-xs sm:text-sm leading-5 text-gray-900 focus:ring-0 placeholder-gray-500 bg-transparent"
                                                        value={selectedCustomer?.customerName || customerQuery}
                                                        onChange={(e) => {
                                                            setCustomerQuery(e.target.value);
                                                            if (selectedCustomer) setSelectedCustomer(null);
                                                            setIsCustomerDropdownOpen(true);
                                                        }}
                                                        onFocus={() => setIsCustomerDropdownOpen(true)}
                                                        placeholder="Search customers..."
                                                    />
                                                    {selectedCustomer && (
                                                        <button 
                                                            className="absolute inset-y-0 right-1.5 sm:right-2 flex items-center"
                                                            onClick={() => {
                                                                setSelectedCustomer(null);
                                                                setCustomerQuery('');
                                                            }}
                                                        >
                                                            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 hover:text-gray-600" />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <PortalDropdown
                                                    isOpen={isCustomerDropdownOpen && !selectedCustomer}
                                                    setIsDropdownOpen={setIsCustomerDropdownOpen}
                                                    triggerRef={customerTriggerRef}
                                                >
                                                    {filteredCustomers && filteredCustomers.length > 0 ? (
                                                        filteredCustomers.map((customer: Customer) => (
                                                            <div
                                                                key={customer.customerId}
                                                                className="cursor-pointer select-none relative py-2 pl-8 pr-4 text-gray-900 hover:bg-blue-100 transition-colors text-sm"
                                                                onClick={() => handleCustomerChange(customer)}
                                                            >
                                                                <span className="block truncate">{customer.customerName}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="py-2 px-4 text-sm text-gray-500">No customers found</div>
                                                    )}
                                                </PortalDropdown>
                                            </div>
                                            
                                            {/* Display Customer Quotes */}
                                            {selectedCustomer && (
                                                isLoadingCustomerQuotes ? (
                                                    <CustomerQuotesSkeleton />
                                                ) : (
                                                    <div className="bg-white rounded-lg p-2 sm:p-3 max-h-60 overflow-y-auto border border-gray-200">
                                                        <p className="text-xs font-medium text-gray-700 mb-2">
                                                            Quotes for {selectedCustomer.customerName}:
                                                        </p>
                                                        {customerQuotesNotInRun.length > 0 ? (
                                                            customerQuotesNotInRun.map((quote: QuoteSummary) => (
                                                                <div
                                                                    key={quote.id}
                                                                    onClick={() => handleAddQuote(quote)}
                                                                    className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200 hover:border-green-400 hover:bg-green-50 cursor-pointer mb-1.5 transition-colors"
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">#{quote.quoteNumber || quote.id}</p>
                                                                        <p className="text-xs text-gray-600 truncate">{quote.customerName}</p>
                                                                        {quote.createdAt && (
                                                                            <p className="text-xs text-gray-400 whitespace-nowrap">
                                                                                {quote.createdAt}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                                        <p className="text-xs sm:text-sm font-semibold text-green-700">{formatCurrency(quote.totalAmount)}</p>
                                                                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic py-2">No available quotes for this customer</p>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-3 sm:mt-4 sm:justify-end">
                                    <button onClick={handleCancelEdit} className="flex items-center justify-center text-xs sm:text-sm px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 cursor-pointer">
                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveChanges}
                                        disabled={updateRunQuotesMutation.isPending}
                                        className="flex items-center justify-center text-xs sm:text-sm px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                        {updateRunQuotesMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </DndContext>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="space-y-1.5 sm:hidden">
                                    {run.quotes?.map((quote: RunQuote) => (
                                        <div 
                                            key={quote.quoteId}
                                            onClick={() => handleQuoteNavigate(quote.quoteId)}
                                            className={`bg-white border border-gray-200 rounded-lg p-2.5 ${loadingQuoteId === quote.quoteId ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-blue-300 hover:shadow-sm'} transition-all`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-blue-600 whitespace-nowrap">
                                                        #{quote.quoteNumber || quote.quoteId}
                                                    </p>
                                                    {loadingQuoteId === quote.quoteId && (
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 flex-shrink-0"></div>
                                                    )}
                                                </div>
                                                <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full capitalize whitespace-nowrap flex-shrink-0 ${
                                                    quote.orderStatus === 'assigned' ? 'bg-blue-100 text-blue-800' : 
                                                    quote.orderStatus === 'preparing' ? 'bg-orange-100 text-orange-800' : 
                                                    quote.orderStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                                                    quote.orderStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {quote.orderStatus}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-1 truncate">{quote.customerName}</p>
                                            <p className="text-sm font-semibold text-green-700">{formatCurrency(quote.totalAmount)}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote ID</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {run.quotes?.map((quote: RunQuote) => (
                                                <tr 
                                                    key={quote.quoteId}
                                                    onClick={() => handleQuoteNavigate(quote.quoteId)}
                                                    className={`hover:bg-blue-50 ${loadingQuoteId === quote.quoteId ? 'opacity-50 cursor-wait' : 'cursor-pointer'} transition-colors duration-150`}
                                                >
                                                    <td className="px-3 py-2.5 whitespace-nowrap text-sm font-semibold text-blue-600">
                                                        <div className="flex items-center gap-2">
                                                            #{quote.quoteNumber || quote.quoteId}
                                                            {loadingQuoteId === quote.quoteId && (
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-600">{quote.customerName}</td>
                                                    <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                                            quote.orderStatus === 'assigned' ? 'bg-blue-100 text-blue-800' : 
                                                            quote.orderStatus === 'preparing' ? 'bg-orange-100 text-orange-800' : 
                                                            quote.orderStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' : 
                                                            quote.orderStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {quote.orderStatus} 
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-right font-semibold text-green-700">{formatCurrency(quote.totalAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {isAdmin && (
                                    <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-3 sm:mt-4 sm:justify-end">
                                        <button onClick={() => handleChangeRunStatus('pending')} disabled={optimisticStatus === 'pending' || updateStatusMutation.isPending} className="text-xs sm:text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">Mark Pending</button>
                                        <button onClick={() => handleChangeRunStatus('completed')} disabled={optimisticStatus === 'completed' || updateStatusMutation.isPending} className="text-xs sm:text-sm px-3 py-1.5 rounded-md border border-green-600 text-green-600 hover:bg-green-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">Mark Completed</button>
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