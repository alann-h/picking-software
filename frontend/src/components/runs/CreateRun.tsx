import React, { useState, useMemo, Suspense, useTransition, Fragment } from 'react';
import { PlusCircle, ListPlus, Trash2, GripVertical, Inbox, Calendar, Search, Check, Users, Package, ArrowRight, Sparkles, ChevronDown, X, Zap, FileText, Plus } from 'lucide-react';
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
            className="group flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all duration-200"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        #{quote.quoteNumber || quote.id}
                    </span>
                    <span className="text-sm text-gray-600 truncate flex-1">
                        {quote.customerName}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    ${(quote.totalAmount || 0).toFixed(2)}
                </span>
                <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                    {quote.timeStarted?.split(',')[0] || 'N/A'}
                </div>
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />
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
            className={`group p-3 mb-2 select-none flex items-center bg-white border rounded-lg transition-all duration-200 ${
                isDragging 
                    ? 'border-blue-400 shadow-xl scale-105' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
        >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pr-3 text-gray-400 hover:text-blue-600 touch-none transition-colors">
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-grow min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate mb-0.5">#{quote.quoteNumber || quote.id}</p>
                <p className="text-xs text-gray-500 truncate">{quote.customerName}</p>
            </div>
            {onRemove && (
                <button 
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100" 
                    onClick={() => onRemove(quote.id)}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};

const RunColumn: React.FC<{ run: RunBuilder, index: number, onRemove: (id: string) => void, onUpdateName: (id: string, name: string) => void }> = ({ run, index, onRemove, onUpdateName }) => {
    const { setNodeRef } = useDroppable({ id: run.id });

    return (
        <div className="min-w-[300px] w-[300px] flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder={`Run ${index + 1}`}
                            value={run.runName || ''}
                            onChange={(e) => onUpdateName(run.id, e.target.value)}
                            className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none w-full placeholder-gray-400 focus:placeholder-gray-500"
                        />
                        <p className="text-xs text-gray-500">{run.quotes.length} {run.quotes.length !== 1 ? 'quotes' : 'quote'}</p>
                    </div>
                </div>
                <button 
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer transition-all duration-200 flex-shrink-0" 
                    onClick={() => onRemove(run.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <SortableContext id={run.id} items={run.quotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="flex-grow p-3 overflow-y-auto min-h-[400px] bg-gray-50/50">
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
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 flex flex-col overflow-hidden shadow-sm">
            {filteredQuotes.length === 0 ? (
                <EmptyState text={quoteSearchQuery ? "No quotes match your search." : "No pending quotes available."} icon={Search} />
            ) : (
                <>
                    <div className="text-xs text-gray-500 mb-3 flex-shrink-0">
                        Showing {displayedQuotes.length} of {filteredQuotes.length} quotes
                    </div>
                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin min-h-0"
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
        queryKey: ['quotes', customer.customerId],
        queryFn: () => getCustomerQuotes(customer.customerId) as Promise<QuoteSummary[]>,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
    const availableQuotes = quotesData
        .filter((q: QuoteSummary) => !stagedQuoteIds.has(q.id))
        .map((quote: QuoteSummary) => ({ ...quote, customerId: customer.customerId }));

    const displayedQuotes = availableQuotes.slice(0, displayCount);
    const hasMore = displayCount < availableQuotes.length;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore) {
            setDisplayCount(prev => Math.min(prev + 15, availableQuotes.length));
        }
    };

    return (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 flex flex-col overflow-hidden shadow-sm">
            {availableQuotes.length === 0 ? (
                <EmptyState text="No available quotes found for this customer." icon={Users} />
            ) : (
                <>
                    <div className="text-xs text-gray-500 mb-3 flex-shrink-0">
                        Showing {displayedQuotes.length} of {availableQuotes.length} quotes
                    </div>
                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin min-h-0"
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
export const CreateRun: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { handleOpenSnackbar } = useSnackbarContext();
    const { userCompanyId } = useAuth();

    const [isPending, startTransition] = useTransition();

    const [stagedQuotes, setStagedQuotes] = useState<QuoteSummary[]>([]);
    const [runsToCreate, setRunsToCreate] = useState<RunBuilder[]>([]);
    const [activeDraggedItem, setActiveDraggedItem] = useState<QuoteSummary | null>(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState<'quick' | 'customer'>('quick');
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
        } catch {
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
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Picking Runs</h1>
                    <p className="text-gray-600">Organize quotes into efficient picking runs</p>
                </div>

                {/* Step 1 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">1</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">Find & Stage Quotes</h2>
                    </div>

                    {/* Search Mode Tabs */}
                    <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setSearchMode('quick')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                                searchMode === 'quick'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                            }`}
                        >
                            <Zap className="w-4 h-4" />
                            Quick Find
                        </button>
                        <button
                            onClick={() => setSearchMode('customer')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                                searchMode === 'customer'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            By Customer
                        </button>
                    </div>

                    {/* Quick Find Mode */}
                    {searchMode === 'quick' && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center space-x-2 mb-3">
                                    <Zap className="w-5 h-5 text-blue-500" />
                                    <p className="text-lg font-medium text-gray-900">Search All Quotes</p>
                                </div>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400" aria-hidden="true" />
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-xl py-3 pl-12 pr-4 text-sm leading-5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                                        placeholder="Search by customer name, quote number, or ID..."
                                        value={quoteSearchQuery}
                                        onChange={(e) => setQuoteSearchQuery(e.target.value)}
                                    />
                                    {quoteSearchQuery && (
                                        <button 
                                            className="absolute inset-y-0 right-3 flex items-center"
                                            onClick={() => setQuoteSearchQuery('')}
                                            title="Clear search"
                                        >
                                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        <p className="text-lg font-medium text-gray-900">Pending Quotes</p>
                                    </div>
                                </div>
                                <div className="h-[300px] flex flex-col">
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
                    )}

                    {/* Search by Customer Mode */}
                    {searchMode === 'customer' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-5">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Users className="w-5 h-5 text-blue-500" />
                                    <p className="text-lg font-medium text-gray-900">Select a Customer</p>
                                </div>
                                <div ref={triggerRef} className="relative">
                                    <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white text-left shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                        <Search className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400" aria-hidden="true" />
                                        <input
                                            className="w-full border-none py-3 pl-12 pr-20 text-sm leading-5 text-gray-900 focus:ring-0 placeholder-gray-500 bg-transparent"
                                            value={selectedCustomer?.customerName || customerQuery}
                                            onChange={(event) => {
                                                setCustomerQuery(event.target.value);
                                                if (selectedCustomer) handleCustomerChange(null);
                                                setIsDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            placeholder="Search customers..."
                                        />
                                        {selectedCustomer && (
                                            <button 
                                                className="absolute inset-y-0 right-10 flex items-center pr-1"
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
                                            className="absolute inset-y-0 right-0 flex items-center pr-3"
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
                                                    className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 hover:bg-blue-50 transition-colors"
                                                    onClick={() => handleCustomerChange(customer)}
                                                >
                                                    <span className={`block truncate ${selectedCustomer?.customerId === customer.customerId ? 'font-medium' : 'font-normal'}`}>
                                                        {customer.customerName}
                                                    </span>
                                                    {selectedCustomer?.customerId === customer.customerId ? (
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                          <Check className="h-5 w-5" aria-hidden="true" />
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ))
                                        )}
                                    </PortalDropdown>
                                </div>
                            </div>
                            <div className="lg:col-span-7">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Package className="w-5 h-5 text-blue-500" />
                                    <p className="text-lg font-medium text-gray-900">Available Quotes</p>
                                </div>
                                <div className="h-[300px] flex flex-col">
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
                    )}
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">2</span>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Build Picking Runs</h2>
                        </div>
                        <button
                            onClick={handleFinalizeRuns}
                            disabled={createRunMutation.isPending}
                            className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                        >
                            {createRunMutation.isPending ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="-ml-1 mr-2 h-4 w-4" />
                                    Create Runs
                                </>
                            )}
                        </button>
                    </div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-4">
                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col" style={{height: '500px'}}>
                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-sm font-semibold text-gray-900">Staging Pool</h3>
                                            <div className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                                                {stagedQuotes.length}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-3 overflow-y-auto bg-gray-50/50">
                                        <SortableContext id="staged-quotes" items={stagedQuotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                            {stagedQuotes.length > 0 ? (
                                                <div className="space-y-2">
                                                    {stagedQuotes.map(q => <DraggableQuoteCard key={q.id} quote={q} onRemove={handleUnstageQuote} />)}
                                                </div>
                                            ) : (
                                                <EmptyState text="Click + on quotes above to stage them here" icon={Package} />
                                            )}
                                        </SortableContext>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-8">
                                 <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Run Columns</h3>
                                    <button 
                                        onClick={handleAddNewRun} 
                                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-all duration-200"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Add Run
                                    </button>
                                </div>
                                <div className="border border-gray-200 rounded-xl flex overflow-x-auto p-4 bg-gray-50" style={{height: '500px'}}>
                                    {runsToCreate.length > 0 ? (
                                        <div className="flex space-x-4 h-full">
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
                        {createPortal(
                            <DragOverlay>
                                {activeDraggedItem ? <DraggableQuoteCard quote={activeDraggedItem} /> : null}
                            </DragOverlay>,
                            document.body
                        )}
                    </DndContext>
                </div>
            </div>
        </div>
    );
};