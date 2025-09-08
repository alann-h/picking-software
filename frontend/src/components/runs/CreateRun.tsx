import React, { useState, useMemo, Suspense, useTransition, Fragment } from 'react';
import { PlusCircle, ListPlus, Trash2, GripVertical, Inbox, Calendar, Search } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Combobox, Transition, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { Customer, QuoteSummary } from '../../utils/types';
import { getCustomers } from '../../api/customers';
import { getCustomerQuotes } from '../../api/quote';
import { createRunFromQuotes } from '../../api/runs';
import { useSnackbarContext } from '../SnackbarContext';
import { useSearchParams } from 'react-router-dom';
import { AvailableQuotesSkeleton } from '../Skeletons'
import { useAuth } from '../../hooks/useAuth';

// --- UI COMPONENTS ---
const EmptyState = ({ text, className = "" }: { text: string, className?: string }) => (
    <div className={`flex flex-col justify-center items-center h-full p-2 text-gray-500 text-center ${className}`}>
        <Inbox className="w-12 h-12 mb-2 text-gray-400" />
        <p className="text-sm">{text}</p>
    </div>
);

const QuoteFinderItem: React.FC<{ quote: QuoteSummary, onStage: () => void }> = ({ quote, onStage }) => (
    <div className="p-2 mb-1 flex justify-between items-center border border-gray-200 rounded-md transition-colors hover:border-blue-500 hover:shadow-sm bg-white">
        <div className="flex flex-col">
            <p className="text-sm font-bold">Quote #{quote.id}</p>
            <div className="flex items-center space-x-3 text-gray-500 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">${(quote.totalAmount || 0).toFixed(2)}</span>
                <div className="flex items-center space-x-1"><Calendar className="w-3 h-3"/> <p className="text-xs">{quote.lastModified ? new Date(quote.lastModified).toLocaleDateString() : 'N/A'}</p></div>
            </div>
        </div>
        <button onClick={onStage} className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100 cursor-pointer">
            <ListPlus className="w-5 h-5" />
        </button>
    </div>
);

const DraggableQuoteCard: React.FC<{ quote: QuoteSummary, onRemove?: (id: string) => void }> = ({ quote, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        boxShadow: isDragging ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} className="p-2 mb-1 select-none flex items-center bg-white border rounded-md">
            <div {...attributes} {...listeners} className="cursor-grab pr-2 text-gray-400 touch-none"><GripVertical /></div>
            <div className="flex-grow">
                <p className="text-sm font-bold">Quote #{quote.id}</p>
                <p className="text-xs text-gray-500">{quote.customerName}</p>
            </div>
            {onRemove && (
                <button className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 cursor-pointer" onClick={() => onRemove(quote.id)}>
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

const RunColumn: React.FC<{ run: RunBuilder, index: number, onRemove: (id: string) => void }> = ({ run, index, onRemove }) => {
    const { setNodeRef } = useDroppable({ id: run.id });

    return (
        <div className="min-w-[280px] w-[280px] p-2 bg-gray-100 flex flex-col border border-gray-300 rounded-lg">
            <div className="flex justify-between items-center mb-1">
                <p className="text-md font-bold">New Run {index + 1}</p>
                <button className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 cursor-pointer" onClick={() => onRemove(run.id)}>
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <SortableContext id={run.id} items={run.quotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="flex-grow bg-gray-50 rounded p-1 overflow-y-auto">
                    {run.quotes.length > 0 ? (
                        run.quotes.map(q => <DraggableQuoteCard key={q.id} quote={q} />)
                    ) : (
                        <EmptyState className="p-1 h-full" text="Drag quotes here." />
                    )}
                </div>
            </SortableContext>
        </div>
    );
};
interface RunBuilder {
  id: string;
  quotes: QuoteSummary[];
}


    const AvailableQuotes: React.FC<{ customer: Customer, stagedQuoteIds: Set<string>, onStageQuote: (quote: QuoteSummary) => void }> = ({ customer, stagedQuoteIds, onStageQuote }) => {

    const { data: quotesData } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId],
        queryFn: () => getCustomerQuotes(customer.customerId),
    });

    const availableQuotes = quotesData
        .filter(q => !stagedQuoteIds.has(q.id))
        .map(quote => ({ ...quote, customerId: customer.customerId }));

    return (
        <div className="flex-grow p-1 overflow-y-auto bg-gray-50 rounded-md">
            {availableQuotes.length > 0 ? (
                availableQuotes.map(q => <QuoteFinderItem key={q.id} quote={q} onStage={() => onStageQuote(q)} />)
            ) : (
                <EmptyState text="No available quotes found for this customer." />
            )}
        </div>
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
    const [customerQuery, setCustomerQuery] = useState('');

    const { data: customers } = useSuspenseQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers,
    });
    
    const filteredCustomers =
    customerQuery === ''
      ? customers
      : customers.filter((customer) =>
          customer.customerName
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(customerQuery.toLowerCase().replace(/\s+/g, ''))
        )

    const selectedCustomer = useMemo(() => {
        const customerId = searchParams.get('customerId');
        return customers?.find(c => c.customerId === customerId) || null;
    }, [customers, searchParams]);

    const handleCustomerChange = (customer: Customer | null) => {
        startTransition(() => {
            setSearchParams(customer ? { customerId: customer.customerId } : {});
        });
    };

    const stagedQuoteIds = useMemo(() => new Set(stagedQuotes.map(q => q.id)), [stagedQuotes]);
    const createRunMutation = useMutation({
        mutationFn: (quoteIds: string[]) => createRunFromQuotes(quoteIds, userCompanyId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs'] });
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
        <div className="flex flex-col space-y-4">
            <div className="border border-gray-200 rounded-lg p-4 md:p-6">
                <h2 className="text-lg font-semibold mb-4">Step 1: Find & Stage Quotes</h2>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-5">
                        <p className="text-md font-medium mb-2">Select a Customer</p>
                        <Combobox value={selectedCustomer} onChange={handleCustomerChange}>
                            <div className="relative">
                                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                                    <Search className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                                    <ComboboxInput
                                        className="w-full border-none py-2 pl-10 pr-4 text-sm leading-5 text-gray-900 focus:ring-0"
                                        displayValue={(customer: Customer | null) => customer?.customerName || ''}
                                        onChange={(event) => setCustomerQuery(event.target.value)}
                                        placeholder="Search by customer name..."
                                    />
                                </div>
                                <Transition
                                    as={Fragment}
                                    leave="transition ease-in duration-100"
                                    leaveFrom="opacity-100"
                                    leaveTo="opacity-0"
                                    afterLeave={() => setCustomerQuery('')}
                                >
                                    <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                                    {filteredCustomers.length === 0 && customerQuery !== '' ? (
                                        <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                                        Nothing found.
                                        </div>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                        <ComboboxOption
                                            key={customer.customerId}
                                            className="relative cursor-pointer select-none py-2 px-4 text-gray-900 data-[active]:bg-blue-600 data-[active]:text-white"
                                            value={customer}
                                        >
                                            {({ selected }) => (
                                            <>
                                                <span
                                                className={`block truncate ${
                                                    selected ? 'font-medium' : 'font-normal'
                                                }`}
                                                >
                                                {customer.customerName}
                                                </span>
                                            </>
                                            )}
                                        </ComboboxOption>
                                        ))
                                    )}
                                    </ComboboxOptions>
                                </Transition>
                            </div>
                        </Combobox>
                    </div>
                    <div className="md:col-span-7">
                        <p className="text-md font-medium mb-2">Available Quotes</p>
                        <div className="h-[250px] flex flex-col">
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
                        </div>
                    </div>
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 md:p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Step 2: Build Picking Runs</h2>
                    <button
                        onClick={handleFinalizeRuns}
                        disabled={createRunMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {createRunMutation.isPending ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
                        )}
                        Create Runs
                    </button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-4">
                            <h3 className="text-md font-semibold text-gray-600 mb-2">Staging Pool ({stagedQuotes.length})</h3>
                            <div className="h-[450px] p-2 bg-gray-100 rounded-lg overflow-y-auto">
                                <SortableContext id="staged-quotes" items={stagedQuotes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                    {stagedQuotes.length > 0 ? stagedQuotes.map(q => <DraggableQuoteCard key={q.id} quote={q} onRemove={handleUnstageQuote} />) : <EmptyState text="Add quotes from the list above to stage them for a run." />}
                                </SortableContext>
                            </div>
                        </div>
                        <div className="md:col-span-8">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="text-md font-semibold text-gray-600">Run Columns</h3>
                                <button onClick={handleAddNewRun} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                    <PlusCircle className="w-4 h-4 mr-1" />
                                    Add New Run
                                </button>
                            </div>
                            <div className="border border-gray-200 rounded-lg flex overflow-x-auto p-2 min-h-[442px] bg-gray-100">
                                {runsToCreate.length > 0 ? (
                                    <div className="flex space-x-3 min-h-[410px]">
                                        {runsToCreate.map((run, index) => (
                                            <RunColumn key={run.id} run={run} index={index} onRemove={handleRemoveRun} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState text="Click 'Add New Run' to create your first run column." className="w-full"/>
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
    );
};