import React, { useState, useMemo, Suspense, useTransition, Fragment } from 'react';
import { PlusCircle, ListPlus, Trash2, GripVertical, Inbox, Calendar, Search, Check, Users, Package, ArrowRight, Sparkles, ChevronDown, X } from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
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

const QuoteFinderItem: React.FC<{ quote: QuoteSummary, onStage: () => void }> = ({ quote, onStage }) => (
    <div className="group p-4 mb-3 flex justify-between items-center border border-gray-200 rounded-xl transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 bg-white">
        <div className="flex flex-col flex-1">
            <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm font-semibold text-gray-900">Quote #{quote.quoteNumber || quote.id}</p>
            </div>
            <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center space-x-1">
                    <span className="text-sm font-bold text-green-600">${(quote.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-gray-400"/>
                    <p className="text-xs">{quote.lastModified ? new Date(quote.lastModified).toLocaleDateString() : 'N/A'}</p>
                </div>
            </div>
        </div>
        <button 
            onClick={onStage} 
            className="p-2 text-blue-600 hover:text-white rounded-lg hover:bg-blue-600 transition-all duration-200 cursor-pointer group-hover:scale-105"
        >
            <ListPlus className="w-4 h-4" />
        </button>
    </div>
);

const DraggableQuoteCard: React.FC<{ quote: QuoteSummary, onRemove?: (id: string) => void }> = ({ quote, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        boxShadow: isDragging ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)' : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
        opacity: isDragging ? 0.8 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} className="group p-3 mb-2 select-none flex items-center bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200">
            <div {...attributes} {...listeners} className="cursor-grab pr-3 text-gray-400 hover:text-gray-600 touch-none transition-colors">
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <p className="text-sm font-semibold text-gray-900 truncate">Quote #{quote.quoteNumber || quote.id}</p>
                </div>
                <p className="text-xs text-gray-600 truncate">{quote.customerName}</p>
            </div>
            {onRemove && (
                <button 
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100" 
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
        <div className="min-w-[300px] w-[300px] p-4 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col border border-blue-200 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder={`Run ${index + 1} Name`}
                            value={run.runName || ''}
                            onChange={(e) => onUpdateName(run.id, e.target.value)}
                            className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none w-full placeholder-gray-500"
                        />
                        <p className="text-xs text-gray-600">{run.quotes.length} quote{run.quotes.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button 
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-all duration-200" 
                    onClick={() => onRemove(run.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <SortableContext id={run.id} items={run.quotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="flex-grow bg-white rounded-lg p-2 overflow-y-auto border border-blue-100 min-h-[200px]">
                    {run.quotes.length > 0 ? (
                        run.quotes.map(q => <DraggableQuoteCard key={q.id} quote={q} />)
                    ) : (
                        <EmptyState className="p-2 h-full" text="Drag quotes here" icon={ArrowRight} />
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


    const AvailableQuotes: React.FC<{ customer: Customer, stagedQuoteIds: Set<string>, onStageQuote: (quote: QuoteSummary) => void }> = ({ customer, stagedQuoteIds, onStageQuote }) => {

    const { data: quotesData } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId],
        queryFn: () => getCustomerQuotes(customer.customerId) as Promise<QuoteSummary[]>,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes - quotes don't change that often
        gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    });
    const availableQuotes = quotesData
        .filter((q: QuoteSummary) => !stagedQuoteIds.has(q.id))
        .map((quote: QuoteSummary) => ({ ...quote, customerId: customer.customerId }));

    return (
        <div className="flex-grow p-3 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            {availableQuotes.length > 0 ? (
                <div className="space-y-2">
                    {availableQuotes.map((q: QuoteSummary) => <QuoteFinderItem key={q.id} quote={q} onStage={() => onStageQuote(q)} />)}
                </div>
            ) : (
                <EmptyState text="No available quotes found for this customer." icon={Users} />
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
            createRunMutation.mutateAsync({ 
                // Convert all quote IDs to strings to ensure consistent data type
                quoteIds: run.quotes.map(q => String(q.id)),
                runName: run.runName || undefined
            })
        );
        
        try {
            const createdRuns = await Promise.all(creationPromises);
            setRunsToCreate([]);
            setStagedQuotes([]);
            
            if (createdRuns.length === 1) {
                handleOpenSnackbar(`Run #${createdRuns[0].run_number} created successfully!`, 'success');
            } else {
                const runNumbers = createdRuns.map(run => `#${run.run_number}`).join(', ');
                handleOpenSnackbar(`Runs ${runNumbers} created successfully!`, 'success');
            }
        } catch {
            // Errors are handled by the mutation's onError callback
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
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Picking Runs</h1>
                    </div>
                    <p className="text-gray-600 max-w-2xl mx-auto">Organize quotes into efficient picking runs for your warehouse operations</p>
                </div>

                {/* Step 1 */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">1</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">Find & Stage Quotes</h2>
                    </div>
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
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">2</span>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Build Picking Runs</h2>
                        </div>
                        <button
                            onClick={handleFinalizeRuns}
                            disabled={createRunMutation.isPending}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:from-blue-300 disabled:to-blue-400 cursor-pointer disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                        >
                            {createRunMutation.isPending ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <Sparkles className="-ml-1 mr-2 h-5 w-5" />
                            )}
                            Create Runs
                        </button>
                    </div>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4">
                                <div className="flex items-center space-x-2 mb-4">
                                    <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-xs">S</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Staging Pool</h3>
                                    <div className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                                        {stagedQuotes.length}
                                    </div>
                                </div>
                                <div className="h-[500px] p-3 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl border border-orange-200 overflow-y-auto">
                                    <SortableContext id="staged-quotes" items={stagedQuotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                        {stagedQuotes.length > 0 ? (
                                            <div className="space-y-2">
                                                {stagedQuotes.map(q => <DraggableQuoteCard key={q.id} quote={q} onRemove={handleUnstageQuote} />)}
                                            </div>
                                        ) : (
                                            <EmptyState text="Add quotes from the list above to stage them for a run." icon={Package} />
                                        )}
                                    </SortableContext>
                                </div>
                            </div>
                            <div className="lg:col-span-8">
                                 <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">R</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Run Columns</h3>
                                    </div>
                                    <button 
                                        onClick={handleAddNewRun} 
                                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        Add New Run
                                    </button>
                                </div>
                                <div className="border border-gray-200 rounded-xl flex overflow-x-auto p-4 min-h-[500px] bg-gradient-to-br from-gray-50 to-gray-100">
                                    {runsToCreate.length > 0 ? (
                                        <div className="flex space-x-4 min-h-[460px]">
                                            {runsToCreate.map((run, index) => (
                                                <RunColumn key={run.id} run={run} index={index} onRemove={handleRemoveRun} onUpdateName={handleUpdateRunName} />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState text="Click 'Add New Run' to create your first run column." className="w-full" icon={ArrowRight}/>
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