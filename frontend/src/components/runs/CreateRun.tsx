import React, { useState, useMemo, Suspense, useTransition, Fragment } from 'react';
import { PlusCircle, Trash2, GripVertical, Inbox, Search, Check, Users, Users as UserIcon, Package, Sparkles, ChevronDown, X, Zap, FileText, Plus } from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Customer, QuoteSummary } from '../../utils/types';
import { getCustomers } from '../../api/customers';
import { getCustomerQuotes, getQuotesWithStatus } from '../../api/quote';
import { createRunFromQuotes } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';
import { useSearchParams } from 'react-router-dom';
import { AvailableQuotesSkeleton } from '../Skeletons'
import { useAuth } from '../../hooks/useAuth';
import PortalDropdown from '../PortalDropdown';

// --- UI COMPONENTS ---
const EmptyState = ({ text, className = "", icon: Icon = Inbox }: { text: string, className?: string, icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> }) => (
    <div className={`flex flex-col justify-center items-center h-full p-6 text-center ${className}`}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 font-medium">{text}</p>
    </div>
);

const QuoteFinderItem: React.FC<{ quote: QuoteSummary, onStage: () => void }> = ({ quote, onStage }) => {
    return (
        <div 
            onClick={onStage}
            className="group flex items-center justify-between px-2 sm:px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all duration-200"
        >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-blue-600 whitespace-nowrap">
                    #{quote.quoteNumber || quote.id}
                </span>
                <span className="text-xs sm:text-sm text-gray-600 truncate flex-1">
                    {quote.customerName}
                </span>
                {quote.createdAt && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {quote.createdAt}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <span className="text-xs sm:text-sm font-semibold text-emerald-600 whitespace-nowrap">
                    ${(quote.totalAmount || 0).toFixed(2)}
                </span>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 group-hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
};

const DraggableQuoteCard: React.FC<{ quote: QuoteSummary, onRemove?: (id: string) => void }> = ({ quote, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.9 : 1,
    };
    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`group p-2 mb-1.5 select-none flex items-center bg-white border rounded-lg transition-all duration-200 ${
                isDragging 
                    ? 'border-blue-400 shadow-xl scale-105' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pr-2 text-gray-400 hover:text-blue-600 touch-none transition-colors flex-shrink-0">
                <GripVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="flex-grow min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate mb-0.5">#{quote.quoteNumber || quote.id}</p>
                <p className="text-xs text-gray-500 truncate">{quote.customerName}</p>
            </div>
            {onRemove && (
                <button 
                    className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0" 
                    onClick={() => onRemove(quote.id)}
                >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
            )}
        </div>
    );
};

const RunColumn: React.FC<{ run: RunBuilder, index: number, onRemove: (id: string) => void, onUpdateName: (id: string, name: string) => void }> = ({ run, index, onRemove, onUpdateName }) => {
    const { setNodeRef } = useDroppable({ id: run.id });

    return (
        <div className="min-w-[240px] w-[240px] sm:min-w-[280px] sm:w-[280px] h-full flex flex-col bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
            <div className="flex justify-between items-center p-2 sm:p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs sm:text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder={`Run ${index + 1}`}
                            value={run.runName || ''}
                            onChange={(e) => onUpdateName(run.id, e.target.value)}
                            className="text-xs sm:text-sm font-semibold text-gray-900 bg-transparent border-none outline-none w-full placeholder-gray-400 focus:placeholder-gray-500"
                        />
                        <p className="text-xs text-gray-500">{run.quotes.length} {run.quotes.length !== 1 ? 'quotes' : 'quote'}</p>
                    </div>
                </div>
                <button 
                    className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer transition-all duration-200 flex-shrink-0" 
                    onClick={() => onRemove(run.id)}
                >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
            </div>
            <SortableContext id={run.id} items={run.quotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="flex-1 p-2 sm:p-2.5 overflow-y-auto min-h-0 bg-gray-50">
                    {run.quotes.length > 0 ? (
                        run.quotes.map(q => <DraggableQuoteCard key={q.id} quote={q} />)
                    ) : (
                        <EmptyState className="h-full" text="Drag quotes here" icon={Package} />
                    )}
                </div>
            </SortableContext>
        </div>
    );
};
interface RunBuilder {
  id: string;
  quotes: QuoteSummary[];
  runName?: string;
}


const QuickFindQuotes: React.FC<{ stagedQuoteIds: Set<string>, onStageQuote: (quote: QuoteSummary) => void, quoteSearchQuery: string }> = ({ stagedQuoteIds, onStageQuote, quoteSearchQuery }) => {
    const [displayCount, setDisplayCount] = useState(15);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const { data: allQuotes } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', 'pending'],
        queryFn: async () => {
            const response = await getQuotesWithStatus('pending') as QuoteSummary[];
            return response;
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
    });

    const filteredQuotes = useMemo(() => {
        let quotes = allQuotes.filter((q: QuoteSummary) => !stagedQuoteIds.has(q.id));
        
        if (quoteSearchQuery) {
            const searchLower = quoteSearchQuery.toLowerCase().replace(/\s+/g, '');
            quotes = quotes.filter((q: QuoteSummary) => 
                q.customerName.toLowerCase().replace(/\s+/g, '').includes(searchLower) ||
                q.quoteNumber.toLowerCase().replace(/\s+/g, '').includes(searchLower) ||
                q.id.toLowerCase().includes(searchLower)
            );
        }
        
        return quotes;
    }, [allQuotes, stagedQuoteIds, quoteSearchQuery]);

    const displayedQuotes = filteredQuotes.slice(0, displayCount);
    const hasMore = displayCount < filteredQuotes.length;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Load more when scrolled to bottom (with 50px threshold)
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore) {
            setDisplayCount(prev => Math.min(prev + 15, filteredQuotes.length));
        }
    };

    return (
        <div className="flex-1 bg-white rounded-lg sm:rounded-xl border border-gray-200 p-2 sm:p-3 flex flex-col overflow-hidden shadow-sm">
            {filteredQuotes.length === 0 ? (
                <EmptyState text={quoteSearchQuery ? "No quotes match your search." : "No pending quotes available."} icon={Search} />
            ) : (
                <>
                    <div className="text-xs text-gray-500 mb-2 flex-shrink-0">
                        Showing {displayedQuotes.length} of {filteredQuotes.length} quotes
                    </div>
                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto space-y-1 sm:space-y-1.5 pr-1 sm:pr-2 scrollbar-thin min-h-0"
                    >
                        {displayedQuotes.map((q: QuoteSummary) => (
                            <QuoteFinderItem key={q.id} quote={q} onStage={() => onStageQuote(q)} />
                        ))}
                        
                        {hasMore && (
                            <div className="py-2 text-center text-xs text-gray-400">
                                Scroll for more...
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const AvailableQuotes: React.FC<{ customer: Customer, stagedQuoteIds: Set<string>, onStageQuote: (quote: QuoteSummary) => void }> = ({ customer, stagedQuoteIds, onStageQuote }) => {
    const [displayCount, setDisplayCount] = useState(15);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const { data: quotesData } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId, 'combined'],
        queryFn: async () => {
            const [remoteQuotes, localQuotes] = await Promise.all([
                getCustomerQuotes(customer.customerId) as Promise<QuoteSummary[]>,
                getQuotesWithStatus('all') as Promise<QuoteSummary[]>
            ]);

            const combined = new Map<string, QuoteSummary>();

            // Add remote quotes first
            remoteQuotes.forEach(q => {
                 const id = String(q.id);
                 combined.set(id, { ...q, id, customerId: customer.customerId });
            });

            // Add/Overwrite with local quotes (to get checking/completed statuses)
            localQuotes.forEach(q => {
                if (q.customerId === customer.customerId) {
                    const id = String(q.id);
                    combined.set(id, q);
                }
            });

            return Array.from(combined.values());
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const availableQuotes = quotesData.filter(q => !stagedQuoteIds.has(q.id));
    const displayedQuotes = availableQuotes.slice(0, displayCount);
    const hasMore = displayCount < availableQuotes.length;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore) {
            setDisplayCount(prev => Math.min(prev + 15, availableQuotes.length));
        }
    };

    return (
        <div className="flex-1 bg-white rounded-lg sm:rounded-xl border border-gray-200 p-2 sm:p-3 flex flex-col overflow-hidden shadow-sm">
            {availableQuotes.length === 0 ? (
                <EmptyState text="No available quotes found for this customer." icon={Users} />
            ) : (
                <>
                    <div className="text-xs text-gray-500 mb-2 flex-shrink-0">
                        Showing {displayedQuotes.length} of {availableQuotes.length} quotes
                    </div>
                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto space-y-1 sm:space-y-1.5 pr-1 sm:pr-2 scrollbar-thin min-h-0"
                    >
                        {displayedQuotes.map((q: QuoteSummary) => (
                            <QuoteFinderItem key={q.id} quote={q} onStage={() => onStageQuote(q)} />
                        ))}
                        
                        {hasMore && (
                            <div className="py-2 text-center text-xs text-gray-400">
                                Scroll for more...
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const STORAGE_KEY_STAGED_QUOTES = 'createRun_stagedQuotes';
const STORAGE_KEY_RUNS_TO_CREATE = 'createRun_runsToCreate';
const STORAGE_KEY_SEARCH_MODE = 'createRun_searchMode';

export const CreateRun: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleOpenSnackbar } = useSnackbarContext();
    const { userCompanyId } = useAuth();

    const [isPending, startTransition] = useTransition();

    // Initialize stagedQuotes from localStorage
    const [stagedQuotes, setStagedQuotes] = useState<QuoteSummary[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_STAGED_QUOTES);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Initialize runsToCreate from localStorage
    const [runsToCreate, setRunsToCreate] = useState<RunBuilder[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_RUNS_TO_CREATE);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [activeDraggedItem, setActiveDraggedItem] = useState<QuoteSummary | null>(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
    
    // Initialize searchMode from localStorage
    const [searchMode, setSearchMode] = useState<'quick' | 'customer'>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SEARCH_MODE);
            return (saved === 'customer' ? 'customer' : 'quick') as 'quick' | 'customer';
        } catch {
            return 'quick';
        }
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const triggerRef = React.useRef<HTMLDivElement>(null);

    const { data: customers } = useSuspenseQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers as () => Promise<Customer[]>,
    });
    
    const filteredCustomers =
    customerQuery === ''
      ? customers
      : customers.filter((customer: Customer) =>
          customer.customerName
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(customerQuery.toLowerCase().replace(/\s+/g, ''))
        )

    const selectedCustomer = useMemo(() => {
        const customerId = searchParams.get('customerId');
        return customers?.find((c: Customer) => c.customerId === customerId) || null;
    }, [customers, searchParams]);

    const handleCustomerChange = (customer: Customer | null) => {
        startTransition(() => {
            setSearchParams(customer ? { customerId: customer.customerId } : {});
        });
        setIsDropdownOpen(false);
    };

    const stagedQuoteIds = useMemo(() => new Set(stagedQuotes.map(q => q.id)), [stagedQuotes]);
    
    // Save stagedQuotes to localStorage whenever it changes
    React.useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_STAGED_QUOTES, JSON.stringify(stagedQuotes));
        } catch (error) {
            console.error('Failed to save staged quotes to localStorage:', error);
        }
    }, [stagedQuotes]);

    // Save runsToCreate to localStorage whenever it changes
    React.useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_RUNS_TO_CREATE, JSON.stringify(runsToCreate));
        } catch (error) {
            console.error('Failed to save runs to localStorage:', error);
        }
    }, [runsToCreate]);

    // Save searchMode to localStorage whenever it changes
    React.useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_SEARCH_MODE, searchMode);
        } catch (error) {
            console.error('Failed to save search mode to localStorage:', error);
        }
    }, [searchMode]);

    const createRunMutation = useMutation({
        mutationFn: ({ quoteIds, runName }: { quoteIds: string[], runName?: string }) => createRunFromQuotes(quoteIds, userCompanyId!, runName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs'] });
        },
        onError: (error: Error) => {
            let errorMessage = error.message || 'Failed to create one or more runs.';
            
            if (errorMessage.includes('Details:')) {
                const parts = errorMessage.split('Details:');
                const summary = parts[0].trim();
                const details = parts[1]?.trim() || '';
                
                const formattedDetails = details
                    .split(';')
                    .map(detail => detail.trim())
                    .filter(detail => detail.length > 0)
                    .map(detail => `• ${detail}`)
                    .join('\n');
                
                errorMessage = `${summary}\n\n${formattedDetails}`;
            }
            
            handleOpenSnackbar(errorMessage, 'error');
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
            createRunMutation.mutateAsync({ 
                quoteIds: run.quotes.map(q => String(q.id)),
                runName: run.runName || undefined
            })
        );
        
        try {
            const createdRuns = await Promise.all(creationPromises);
            setRunsToCreate([]);
            setStagedQuotes([]);
            
            // Clear localStorage after successful creation
            localStorage.removeItem(STORAGE_KEY_STAGED_QUOTES);
            localStorage.removeItem(STORAGE_KEY_RUNS_TO_CREATE);
            localStorage.removeItem(STORAGE_KEY_SEARCH_MODE);
            
            if (createdRuns.length === 1) {
                const run = createdRuns[0];
                const runIdentifier = run.run_name 
                    ? `"${run.run_name}" (Run #${run.run_number})` 
                    : `Run #${run.run_number}`;
                handleOpenSnackbar(`${runIdentifier} created successfully!`, 'success');
            } else {
                const runIdentifiers = createdRuns.map(run => 
                    run.run_name ? `"${run.run_name}" (#${run.run_number})` : `#${run.run_number}`
                ).join(', ');
                handleOpenSnackbar(`${createdRuns.length} runs created successfully: ${runIdentifiers}`, 'success');
            }
        } catch (error) {
            // Error handling is done in the mutation's onError callback
            console.error('Error creating runs:', error);
        }
    };
    
    const handleStageQuote = (quote: QuoteSummary) => {
        setStagedQuotes(prev => [quote, ...prev]);
    };
    const handleUnstageQuote = (quoteId: string) => {
        const quoteToUnstage = stagedQuotes.find(q => q.id === quoteId);
        if (!quoteToUnstage) return;
        setStagedQuotes(prev => prev.filter(q => q.id !== quoteId));
    };
    const handleAddNewRun = () => setRunsToCreate(prev => [...prev, { id: `run-builder-${Date.now()}`, quotes: [], runName: '' }]);
    const handleRemoveRun = (runId: string) => {
        const runToRemove = runsToCreate.find(r => r.id === runId);
        if (!runToRemove) return;
        setStagedQuotes(prev => [...runToRemove.quotes, ...prev]);
        setRunsToCreate(prev => prev.filter(r => r.id !== runId));
    };
    const handleUpdateRunName = (runId: string, runName: string) => {
        setRunsToCreate(prev => prev.map(r => r.id === runId ? { ...r, runName } : r));
    };
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const handleDragStart = (event: DragStartEvent) => {
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
        <div className="space-y-3 sm:space-y-4">
            {/* Step 1 */}
            <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs sm:text-sm">1</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Find & Stage Quotes</h2>
                </div>

                    {/* Search Mode Tabs */}
                    <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4 bg-gray-100 p-1 rounded-lg sm:rounded-xl w-full sm:w-fit">
                        <button
                            onClick={() => setSearchMode('quick')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                                searchMode === 'quick'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                            }`}
                        >
                            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                            Quick Find
                        </button>
                        <button
                            onClick={() => setSearchMode('customer')}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                                searchMode === 'customer'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                            By Customer
                        </button>
                    </div>

                    {/* Quick Find Mode */}
                    {searchMode === 'quick' && (
                        <div className="space-y-2 sm:space-y-3">
                            <div>
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                    <p className="text-sm sm:text-base font-medium text-gray-900">Search All Quotes</p>
                                </div>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-2.5 sm:top-3 left-3 sm:left-4 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" aria-hidden="true" />
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-lg sm:rounded-xl py-2 sm:py-2.5 pl-10 sm:pl-12 pr-10 sm:pr-4 text-xs sm:text-sm leading-5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                                        placeholder="Search by customer, quote #, or ID..."
                                        value={quoteSearchQuery}
                                        onChange={(e) => setQuoteSearchQuery(e.target.value)}
                                    />
                                    {quoteSearchQuery && (
                                        <button 
                                            className="absolute inset-y-0 right-2 sm:right-3 flex items-center"
                                            onClick={() => setQuoteSearchQuery('')}
                                            title="Clear search"
                                        >
                                            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                                    <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
                                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                        <p className="text-sm sm:text-base font-medium text-gray-900">Pending Quotes</p>
                                    </div>
                                    <div className="h-[250px] sm:h-[300px] flex flex-col">
                                        <Suspense fallback={<AvailableQuotesSkeleton />}>
                                            <QuickFindQuotes
                                                stagedQuoteIds={stagedQuoteIds}
                                                onStageQuote={handleStageQuote}
                                                quoteSearchQuery={quoteSearchQuery}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search by Customer Mode */}
                    {searchMode === 'customer' && (
                        <div className="flex flex-col space-y-3 sm:space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 items-start">
                            <div className="w-full lg:col-span-5">
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <UserIcon className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-base font-semibold text-gray-800">Select Customer</h3>
                                    </div>
                                    <div ref={triggerRef} className="relative">
                                        <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                                            <input
                                                className="w-full border-none py-2 pl-3 pr-16 text-sm leading-5 text-gray-900 focus:ring-0"
                                                value={selectedCustomer?.customerName || customerQuery}
                                                onChange={(e) => {
                                                    setCustomerQuery(e.target.value);
                                                    if (selectedCustomer) handleCustomerChange(null);
                                                    setIsDropdownOpen(true);
                                                }}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                placeholder="Search customers..."
                                            />
                                            {selectedCustomer && (
                                                <button 
                                                    className="absolute inset-y-0 right-8 flex items-center pr-1"
                                                    onClick={() => {
                                                        handleCustomerChange(null);
                                                        setCustomerQuery('');
                                                    }}
                                                    title="Clear selection"
                                                >
                                                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                                </button>
                                            )}
                                            <button 
                                                className="absolute inset-y-0 right-0 flex items-center pr-2"
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            >
                                                <ChevronDown className="h-5 w-5 text-gray-400 cursor-pointer" aria-hidden="true" />
                                            </button>
                                        </div>
                                        
                                        <PortalDropdown isOpen={isDropdownOpen} triggerRef={triggerRef} setIsDropdownOpen={setIsDropdownOpen}>
                                            {filteredCustomers.length === 0 && customerQuery !== '' ? (
                                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                    Nothing found.
                                                </div>
                                            ) : (
                                                filteredCustomers.map((customer: Customer) => (
                                                    <div
                                                        key={customer.customerId}
                                                        className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 hover:bg-indigo-50 transition-colors"
                                                        onClick={() => handleCustomerChange(customer)}
                                                    >
                                                        <span className={`block truncate ${selectedCustomer?.customerId === customer.customerId ? 'font-medium' : 'font-normal'}`}>
                                                            {customer.customerName}
                                                        </span>
                                                        {selectedCustomer?.customerId === customer.customerId ? (
                                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                                              <Check className="h-5 w-5" aria-hidden="true" />
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ))
                                            )}
                                        </PortalDropdown>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full lg:col-span-7">
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                        <h3 className="text-sm sm:text-base font-semibold text-gray-800">Available Quotes</h3>
                                    </div>
                                    <div className="h-[250px] sm:h-[300px] flex flex-col">
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
                                                    <EmptyState text="Select a customer to see their quotes." icon={Users} />
                                                )}
                                            </Suspense>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-xs sm:text-sm">2</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Build Picking Runs</h2>
                        </div>
                        <button
                            onClick={handleFinalizeRuns}
                            disabled={createRunMutation.isPending}
                            className="inline-flex items-center justify-center px-4 sm:px-5 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 shadow-sm w-full sm:w-auto"
                        >
                            {createRunMutation.isPending ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="-ml-1 mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Create Runs
                                </>
                            )}
                        </button>
                    </div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <div className="flex flex-col space-y-3 sm:space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-start">
                            {/* Staging Pool */}
                            <div className="w-full lg:col-span-4">
                                <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm flex flex-col h-full lg:h-[450px]">
                                    <div className="flex items-center justify-between p-2 sm:p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0 min-h-[44px] sm:min-h-[52px]">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Staging Pool</h3>
                                            <div className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                                                {stagedQuotes.length}
                                            </div>
                                        </div>
                                        <div className="w-px"></div>
                                    </div>
                                    <div className="flex-1 p-2 sm:p-2.5 overflow-y-auto bg-gray-50 min-h-0">
                                        <SortableContext id="staged-quotes" items={stagedQuotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                            {stagedQuotes.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {stagedQuotes.map(q => <DraggableQuoteCard key={q.id} quote={q} onRemove={handleUnstageQuote} />)}
                                                </div>
                                            ) : (
                                                <EmptyState text="Click + on quotes above to stage them here" icon={Package} />
                                            )}
                                        </SortableContext>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Run Columns */}
                            <div className="w-full lg:col-span-8">
                                <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm flex flex-col h-full lg:h-[450px]">
                                    <div className="flex items-center justify-between p-2 sm:p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0 min-h-[44px] sm:min-h-[52px]">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Run Columns</h3>
                                            <div className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                                                {runsToCreate.length}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleAddNewRun} 
                                            className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-all duration-200"
                                        >
                                            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                                            <span className="hidden sm:inline">Add Run</span>
                                            <span className="sm:hidden">Add</span>
                                        </button>
                                    </div>
                                    <div className="flex-1 flex overflow-x-auto p-2 sm:p-3 bg-gray-50 min-h-0">
                                        {runsToCreate.length > 0 ? (
                                            <div className="flex gap-2 sm:gap-3 h-full">
                                                {runsToCreate.map((run, index) => (
                                                    <RunColumn key={run.id} run={run} index={index} onRemove={handleRemoveRun} onUpdateName={handleUpdateRunName} />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState text="Click 'Add Run' to create your first run column" className="w-full" icon={Package}/>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {createPortal(
                            <DragOverlay>
                                {activeDraggedItem ? <DraggableQuoteCard quote={activeDraggedItem} /> : null}
                            </DragOverlay>,
                            document.body
                        )}
                    </DndContext>
                </div>
            </div>
    );
};