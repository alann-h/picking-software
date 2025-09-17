import React, { useState, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Clock,
  Users,
  History,
  Search,
  X,
  Trash2,
  ListFilter,
  FileText,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { Listbox, Transition, Disclosure, DisclosureButton, DisclosurePanel, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'


// Context and API Imports
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus, deleteQuotesBulk } from '../api/quote';
import { getUserStatus } from '../api/user';
import { QuoteSummary } from '../utils/types';
import { OrderHistorySkeleton } from './Skeletons';
import { getStatusColor } from '../utils/other';
import { ConfirmationDialog } from './ConfirmationDialog';


// =================================================================
// 1. LOGIC HOOK (Remains largely the same)
// =================================================================
const useOrderHistory = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userStatus, error: userError } = useQuery({
    queryKey: ['userStatus'],
    queryFn: getUserStatus,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: quotes = [],
    isLoading: quotesLoading,
    error: quotesError,
    refetch: refetchQuotes
  } = useQuery({
    queryKey: ['quotes', 'history'],
    queryFn: () => getQuotesWithStatus('all'),
    enabled: !!userStatus?.isAdmin,
    staleTime: 5 * 60 * 1000,
  });
  const deleteQuoteMutation = useMutation({
    mutationFn: (quoteIds: string[]) => deleteQuotesBulk(quoteIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', 'history'] });
      handleOpenSnackbar('Quotes deleted successfully', 'success');
    },
    onError: (error) => {
      handleOpenSnackbar(`Failed to delete quotes: ${error.message}`, 'error');
    },
  });

  React.useEffect(() => {
    if (userError) {
      handleOpenSnackbar('Failed to verify admin status.', 'error');
      navigate('/dashboard');
    }
    if (quotesError) {
      handleOpenSnackbar('Failed to fetch order history.', 'error');
    }
  }, [userError, quotesError, handleOpenSnackbar, navigate]);

  React.useEffect(() => {
    if (userStatus && !userStatus.isAdmin) {
      handleOpenSnackbar('Access denied. Admin privileges required.', 'warning');
      navigate('/dashboard');
    }
  }, [userStatus, handleOpenSnackbar, navigate]);

  return {
    quotes: quotes as QuoteSummary[],
    isLoading: quotesLoading || !userStatus,
    error: userError || quotesError,
    refetchQuotes,
    deleteQuoteMutation,
    isAdmin: userStatus?.isAdmin || false
  };
};

// =================================================================
// 2. FILTER COMPONENTS
// =================================================================
interface FilterSectionProps {
  filters: { customerName: string; orderStatus: string; quoteNumber: string; };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  orderStatuses: string[];
}

const FilterSection: React.FC<FilterSectionProps> = ({ filters, onFilterChange, onClearFilters, orderStatuses }) => {
  return (
    <Disclosure as="div" className="p-4 md:p-6 mb-4 rounded-lg bg-gray-50">
      {({ open }) => (
        <>
          <DisclosureButton className="w-full flex justify-between items-center text-left cursor-pointer">
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
              {open ? 'Hide' : 'Show'} Filters <ListFilter className="w-4 h-4" />
            </div>
          </DisclosureButton>
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <DisclosurePanel as="div" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Customer Name Filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={filters.customerName}
                    onChange={(e) => onFilterChange('customerName', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                {/* Order Status Filter */}
                <div>
                  <Listbox value={filters.orderStatus} onChange={(value) => onFilterChange('orderStatus', value)}>
                    <div className="relative">
                      <ListboxButton className="relative w-full cursor-pointer rounded-md bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                        <span className="block truncate">{filters.orderStatus || 'All Statuses'}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                          <ListboxOption value="" className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`}>
                            {({ selected }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>All Statuses</span>
                                {selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600"><Check className="h-5 w-5" aria-hidden="true" /></span> : null}
                              </>
                            )}
                          </ListboxOption>
                          {orderStatuses.map((status) => (
                            <ListboxOption key={status} value={status} className={({ active }) =>`relative cursor-pointer select-none py-2 pl-10 pr-4 ${ active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`}>
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{status}</span>
                                  {selected ? <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600"><Check className="h-5 w-5" aria-hidden="true" /></span> : null}
                                </>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Transition>
                    </div>
                  </Listbox>
                </div>
                {/* Quote Number Filter */}
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Quote Number"
                    value={filters.quoteNumber}
                    onChange={(e) => onFilterChange('quoteNumber', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={onClearFilters}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Clear All Filters
                </button>
              </div>
            </DisclosurePanel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
};


// =================================================================
// 3. CHILD UI COMPONENTS
// =================================================================
const EmptyState: React.FC = () => (
  <div className="mt-4 text-center border-2 border-dashed border-gray-200 rounded-lg p-8 sm:p-12 bg-gray-50">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
        <History className="w-10 h-10 text-blue-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-1">No Orders Found 📋</h3>
        <p className="text-gray-500">Try adjusting your filters or check back later for new orders.</p>
      </div>
    </div>
  </div>
);

const PreparerAvatars: React.FC<{ preparers: string[] }> = ({ preparers }) => {
  if (!preparers || preparers.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-gray-500 px-2 py-1 border rounded-full">
        <Users className="w-4 h-4" /> Not started
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {preparers.slice(0, 3).map((preparer, index) => (
          <div key={index} className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold ring-2 ring-white">
            {preparer.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-gray-700">
        {preparers.length === 1 ? preparers[0] : `${preparers.length} preparers`}
      </p>
    </div>
  );
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => (
  <span
    className="px-2.5 py-1 text-xs font-semibold rounded-full text-white capitalize"
    style={{ backgroundColor: getStatusColor(status) }}
  >
    {status || 'Unknown'}
  </span>
);

const QuoteCard: React.FC<{ quote: QuoteSummary; isSelected: boolean; onSelect: (checked: boolean) => void; isAdmin: boolean; }> = ({ quote, isSelected, onSelect, isAdmin }) => {
  const navigate = useNavigate();
  const handleQuoteClick = (e: React.MouseEvent) => {
    // Prevent navigation if the checkbox itself was clicked
    if ((e.target as HTMLElement).closest('.quote-checkbox-container')) return;
    navigate(`/quote?id=${quote.id}`);
  }
  
  const preparerNames = useMemo(() => {
    if (typeof quote.preparerNames === 'string') {
      return quote.preparerNames.split(',').map(name => name.trim()).filter(Boolean);
    }
    return quote.preparerNames || [];
  }, [quote.preparerNames]);

  return (
    <div className="relative">
       {isAdmin && (
        <div className="quote-checkbox-container absolute -top-2 -left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-5 w-5 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      )}
      <div
        onClick={handleQuoteClick}
        className={`h-full border rounded-lg transition-all duration-200 cursor-pointer bg-white ${isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
      >
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-xl font-bold text-blue-600">#{quote.quoteNumber || quote.id}</h2>
            <StatusChip status={quote.orderStatus || 'Unknown'} />
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{quote.customerName}</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-lg font-semibold text-green-700">${quote.totalAmount.toFixed(2)}</p>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <PreparerAvatars preparers={preparerNames} />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Time Taken</p>
                <p className="font-medium">{quote.timeTaken}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Last Modified</p>
                <p className="font-medium">{quote.lastModified}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// =================================================================
// 4. MAIN EXPORTED COMPONENT
// =================================================================
const OrderHistory: React.FC = () => {
  const { quotes, isLoading, error, refetchQuotes, deleteQuoteMutation, isAdmin } = useOrderHistory();
  const [filters, setFilters] = useState({ customerName: '', orderStatus: '', quoteNumber: '' });
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const orderStatuses = useMemo(() => {
    const statuses = quotes.map(quote => quote.orderStatus).filter(Boolean);
    return [...new Set(statuses)];
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => 
      (!filters.customerName || quote.customerName.toLowerCase().includes(filters.customerName.toLowerCase())) &&
      (!filters.orderStatus || quote.orderStatus === filters.orderStatus) &&
      (!filters.quoteNumber || quote.quoteNumber?.toLowerCase().includes(filters.quoteNumber.toLowerCase()))
    );
  }, [quotes, filters]);

  const handleFilterChange = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const handleClearFilters = () => setFilters({ customerName: '', orderStatus: '', quoteNumber: '' });

  const handleSelectAll = (checked: boolean) => {
    setSelectedQuotes(checked ? new Set(filteredQuotes.map(quote => quote.id)) : new Set());
  };

  const handleSelectQuote = (quoteId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuotes);
    if (checked) newSelected.add(quoteId);
    else newSelected.delete(quoteId);
    setSelectedQuotes(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      await deleteQuoteMutation.mutateAsync(Array.from(selectedQuotes));
      setSelectedQuotes(new Set());
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const renderContent = () => {
    if (isLoading) return <OrderHistorySkeleton />;
    if (error) return (
      <div className="mt-3 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md flex justify-between items-center">
        Failed to load order history. Please try again.
        <button onClick={() => refetchQuotes()} className="px-3 py-1 text-sm font-medium border border-red-500 text-red-600 rounded-md hover:bg-red-200 cursor-pointer" disabled={deleteQuoteMutation.isPending}>
          Retry
        </button>
      </div>
    );
    if (filteredQuotes.length === 0) return <EmptyState />;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-1">
        {filteredQuotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            isSelected={selectedQuotes.has(quote.id)}
            onSelect={(checked) => handleSelectQuote(quote.id, checked)}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4">
      <title>Smart Picker | Order History</title>
      
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <History className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
            <p className="text-gray-500">
              {filteredQuotes.length > 0 ? `${filteredQuotes.length} order${filteredQuotes.length === 1 ? '' : 's'} found` : 'No orders found'}
            </p>
          </div>
        </div>
      </div>

      <FilterSection filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} orderStatuses={orderStatuses} />

      {isAdmin && (
        <div className="p-3 mb-4 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between flex-wrap gap-2 min-h-[38px]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                checked={selectedQuotes.size === filteredQuotes.length && filteredQuotes.length > 0}
                ref={input => {
                  if (input) {
                    input.indeterminate = selectedQuotes.size > 0 && selectedQuotes.size < filteredQuotes.length;
                  }
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <label className="text-sm text-gray-700 cursor-pointer">Select All ({selectedQuotes.size}/{filteredQuotes.length})</label>
            </div>
            
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${selectedQuotes.size > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-sm text-gray-600">{selectedQuotes.size} quote{selectedQuotes.size === 1 ? '' : 's'} selected</p>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteQuoteMutation.isPending || selectedQuotes.size === 0}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-red-300 cursor-pointer disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" /> Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {renderContent()}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleBulkDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${selectedQuotes.size} order${selectedQuotes.size === 1 ? '' : 's'}? This action cannot be undone.`}
      />
    </div>
  );
};

export default OrderHistory;
