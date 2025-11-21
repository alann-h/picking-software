import React, { useState, useMemo, useOptimistic } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import {
  Clock,
  Users,
  History,
  Search,
  X,
  Trash2,
  ListFilter,
  FileText,
  ChevronsUpDown,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus, deleteQuotesBulk } from '../api/quote';
import { getUserStatus } from '../api/user';
import { QuoteSummary } from '../utils/types';
import { OrderHistorySkeleton } from './Skeletons';
import { ConfirmationDialog } from './ConfirmationDialog';

// =================================================================
// CONSTANTS
// =================================================================

const statusColors: { [key: string]: { bg: string; text: string } } = {
  pending: { bg: 'bg-blue-100', text: 'text-blue-800' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-800' },
  checking: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  assigned: { bg: 'bg-sky-100', text: 'text-sky-800' },
  default: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Extracts initials from a full name (e.g., "Alan Hattom" -> "AH")
 */
const getInitials = (name: string): string => {
  if (!name) return 'U';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  // Get first letter of first name and first letter of last name
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return firstInitial + lastInitial;
};

// =================================================================
// LOGIC HOOK
// =================================================================

interface UseOrderHistoryReturn {
  quotes: QuoteSummary[];
  isLoading: boolean;
  error: Error | null | undefined;
  refetchQuotes: () => void;
  deleteQuoteMutation: UseMutationResult<unknown, Error, string[], unknown>;
  isAdmin: boolean;
}

const useOrderHistory = (): UseOrderHistoryReturn => {
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

  // Optimistic state for quotes
  const [optimisticQuotes, deleteOptimisticQuotes] = useOptimistic(
    quotes as QuoteSummary[],
    (currentQuotes: QuoteSummary[], quoteIdsToDelete: string[]) => {
      const deleteSet = new Set(quoteIdsToDelete);
      return currentQuotes.filter(quote => !deleteSet.has(quote.id));
    }
  );

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteIds: string[]) => {
      return deleteQuotesBulk(quoteIds);
    },
    onMutate: async (quoteIds: string[]) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['quotes', 'history'] });
      
      // Apply the optimistic update
      deleteOptimisticQuotes(quoteIds);
      
      handleOpenSnackbar('Deleting quotes...', 'info');
    },
    onSuccess: () => {
      // Only invalidate after the mutation succeeds
      queryClient.invalidateQueries({ queryKey: ['quotes', 'history'] });
      handleOpenSnackbar('Quotes deleted successfully', 'success');
    },
    onError: (error) => {
      // On error, refetch to revert the optimistic update
      queryClient.invalidateQueries({ queryKey: ['quotes', 'history'] });
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
    quotes: optimisticQuotes,
    isLoading: quotesLoading || !userStatus,
    error: userError || quotesError,
    refetchQuotes,
    deleteQuoteMutation,
    isAdmin: userStatus?.isAdmin || false
  };
};

// =================================================================
// FILTER COMPONENTS
// =================================================================
interface FilterSectionProps {
  filters: { customerName: string; orderStatus: string; quoteNumber: string };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  orderStatuses: string[];
}

const FilterSection: React.FC<FilterSectionProps> = ({ filters, onFilterChange, onClearFilters, orderStatuses }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasActiveFilters = filters.customerName || filters.orderStatus || filters.quoteNumber;

  return (
    <div className="p-4 md:p-6 mb-4 rounded-lg bg-gray-50">
      <button 
        className="w-full flex justify-between items-center text-left cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
          {isOpen ? 'Hide' : 'Show'} <ListFilter className="w-4 h-4" />
        </div>
      </button>
      
      {isOpen && (
        <div className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
            
            <div className="relative">
              <select
                value={filters.orderStatus}
                onChange={(e) => onFilterChange('orderStatus', e.target.value)}
                className="relative w-full cursor-pointer rounded-md bg-white py-2 pl-3 pr-10 text-left border border-gray-300 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm"
              >
                <option value="">All Statuses</option>
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <ChevronsUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            
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
          
          {hasActiveFilters && (
            <div className="flex justify-end mt-4">
              <button
                onClick={onClearFilters}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <X className="w-4 h-4" /> Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// =================================================================
// UI COMPONENTS
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
            {getInitials(preparer)}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-gray-700">
        {preparers.length === 1 ? preparers[0] : `${preparers.length} preparers`}
      </p>
    </div>
  );
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const colorKey = status?.toLowerCase() || 'default';
  const color = statusColors[colorKey] || statusColors.default;
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${color.bg} ${color.text}`}>
      {status || 'Unknown'}
    </span>
  );
};

const QuoteCard: React.FC<{
  quote: QuoteSummary;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isAdmin: boolean;
  selectionMode: boolean;
}> = ({ quote, isSelected, onSelect, isAdmin, selectionMode }) => {
  const navigate = useNavigate();
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a link
    if ((e.target as HTMLElement).closest('a')) return;
    
    if (selectionMode && isAdmin) {
      onSelect(!isSelected);
    } else if (!selectionMode) {
      navigate(`/quote?id=${quote.id}`);
    }
  };
  
  const preparerNames = useMemo(() => {
    if (typeof quote.preparerNames === 'string') {
      return quote.preparerNames.split(',').map(name => name.trim()).filter(Boolean);
    }
    return quote.preparerNames || [];
  }, [quote.preparerNames]);

  return (
    <div className="relative group">
      <div
        onClick={handleCardClick}
        className={`h-full border rounded-lg transition-all duration-200 cursor-pointer bg-white overflow-hidden ${
          isSelected 
            ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
            : 'border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]'
        }`}
      >
        {/* Header with status */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold text-blue-600">#{quote.quoteNumber || quote.id}</h2>
            <StatusChip status={quote.orderStatus || 'Unknown'} />
          </div>
          <h3 className="text-base font-semibold text-gray-800 truncate">{quote.customerName}</h3>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Amount */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-500">Total Amount</span>
            <span className="text-2xl font-semibold text-emerald-600">${quote.totalAmount.toFixed(2)}</span>
          </div>

          {/* Time Taken */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-500">Time Taken</span>
            <span className="text-lg font-semibold text-blue-600">{quote.timeTaken}</span>
          </div>

          {/* Preparers */}
          <div className="flex items-center gap-2 pt-2">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <PreparerAvatars preparers={preparerNames} />
          </div>

          {/* External Link */}
          {quote.externalSyncUrl && (
            <div className="pt-3 mt-1 border-t border-gray-100">
              <a
                href={quote.externalSyncUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
                <span>View in {quote.externalSyncUrl.includes('xero.com') ? 'Xero' : 'QuickBooks'}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// =================================================================
// MAIN COMPONENT
// =================================================================
const OrderHistory: React.FC = () => {
  const { quotes, isLoading, error, refetchQuotes, deleteQuoteMutation, isAdmin } = useOrderHistory();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  // Initialize filters from URL parameters
  const filters = useMemo(() => ({
    customerName: searchParams.get('customer') || '',
    orderStatus: searchParams.get('status') || '',
    quoteNumber: searchParams.get('quote') || ''
  }), [searchParams]);

  const orderStatuses = useMemo(() => {
    const statuses = quotes.map(quote => quote.orderStatus).filter(Boolean);
    return [...new Set(statuses)];
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => 
      (!filters.customerName || quote.customerName.toLowerCase().includes(filters.customerName.toLowerCase())) &&
      (!filters.orderStatus || quote.orderStatus === filters.orderStatus) &&
      (!filters.quoteNumber || (quote.quoteNumber || quote.id)?.toLowerCase().includes(filters.quoteNumber.toLowerCase()))
    );
  }, [quotes, filters]);

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    const paramMap: Record<string, string> = {
      customerName: 'customer',
      orderStatus: 'status',
      quoteNumber: 'quote'
    };
    
    const paramKey = paramMap[key] || key;
    if (value) {
      newParams.set(paramKey, value);
    } else {
      newParams.delete(paramKey);
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

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
      setSelectionMode(false);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const handleCancelSelection = () => {
    setSelectedQuotes(new Set());
    setSelectionMode(false);
  };

  const renderContent = () => {
    if (isLoading) return <OrderHistorySkeleton />;
    
    if (error) {
      return (
        <div className="mt-3 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md flex justify-between items-center">
          Failed to load order history. Please try again.
          <button 
            onClick={() => refetchQuotes()} 
            className="px-3 py-1 text-sm font-medium border border-red-500 text-red-600 rounded-md hover:bg-red-200 cursor-pointer" 
            disabled={deleteQuoteMutation.isPending}
          >
            Retry
          </button>
        </div>
      );
    }
    
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
            selectionMode={selectionMode}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-4">
      <title>Smart Picker | Order History</title>
      
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <History className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
            <p className="text-gray-500">
              {filteredQuotes.length > 0 
                ? `${filteredQuotes.length} order${filteredQuotes.length === 1 ? '' : 's'} found` 
                : 'No orders found'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterSection 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        onClearFilters={handleClearFilters} 
        orderStatuses={orderStatuses} 
      />

      {/* Bulk Actions (Admin Only) */}
      {isAdmin && (
        <>
          {!selectionMode ? (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setSelectionMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Select Orders
              </button>
            </div>
          ) : (
            <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAll(selectedQuotes.size !== filteredQuotes.length);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    {selectedQuotes.size === filteredQuotes.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm font-medium text-blue-900">
                    {selectedQuotes.size} of {filteredQuotes.length} selected
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedQuotes.size > 0 && (
                    <button
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={deleteQuoteMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedQuotes.size})
                    </button>
                  )}
                  <button
                    onClick={handleCancelSelection}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Content */}
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
