import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CheckCircle2 as CheckIcon,
  ClipboardCheck,
} from 'lucide-react';

// Context and API Imports
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus } from '../api/quote';
import { getUserStatus } from '../api/user';
import { QuoteSummary } from '../utils/types';

// =================================================================
// 0. HELPER FUNCTIONS
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
// 1. INTERFACE
// =================================================================
interface EnhancedQuoteSummary extends QuoteSummary {
  priority?: 'high' | 'medium' | 'low';
}

// =================================================================
// 2. LOGIC HOOK
// =================================================================
const useOrdersToCheck = () => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();

  // Check admin status
  const { data: userStatus, error: userError } = useQuery({
    queryKey: ['userStatus'],
    queryFn: getUserStatus,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch quotes with status 'checking'
  const { 
    data: quotes = [], 
    isLoading: quotesLoading, 
    error: quotesError,
    refetch: refetchQuotes 
  } = useQuery({
    queryKey: ['quotes', 'checking'],
    queryFn: () => getQuotesWithStatus('checking'),
    enabled: !!userStatus?.isAdmin,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Handle errors
  React.useEffect(() => {
    if (userError) {
      handleOpenSnackbar('Failed to verify admin status.', 'error');
      navigate('/dashboard');
    }
    
    if (quotesError) {
      handleOpenSnackbar('Failed to fetch orders to check.', 'error');
    }
  }, [userError, quotesError, handleOpenSnackbar, navigate]);

  // Redirect if not admin
  React.useEffect(() => {
    if (userStatus && !userStatus.isAdmin) {
      handleOpenSnackbar('Access denied. Admin privileges required.', 'warning');
      navigate('/dashboard');
    }
  }, [userStatus, handleOpenSnackbar, navigate]);

  return { 
    quotes: quotes as EnhancedQuoteSummary[], 
    isLoading: quotesLoading || !userStatus,
    error: userError || quotesError,
    refetchQuotes 
  };
};

// =================================================================
// 3. CHILD UI COMPONENTS
// =================================================================
const EmptyState: React.FC = () => (
  <div className="mt-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
    <div className="flex flex-col items-center space-y-3">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <CheckIcon className="h-10 w-10 text-green-500" />
      </div>
      <div>
        <h3 className="mb-1 text-xl font-semibold">All caught up! 🎉</h3>
        <p className="text-gray-500">
          No orders are currently pending review. Great job keeping up with the
          workflow!
        </p>
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

const QuoteCard: React.FC<{ quote: EnhancedQuoteSummary }> = ({ quote }) => {
  const navigate = useNavigate();

  const handleQuoteClick = () => navigate(`/quote?id=${quote.id}`);

  // Parse preparer names - handle both string and array formats
  const preparerNames = React.useMemo(() => {
    if (typeof quote.preparerNames === 'string') {
      return quote.preparerNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
    }
    return quote.preparerNames || [];
  }, [quote.preparerNames]);

  return (
    <div
      onClick={handleQuoteClick}
      className="h-full border rounded-lg transition-all duration-200 cursor-pointer bg-white overflow-hidden border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <h2 className="text-xl font-bold text-blue-600 mb-2">#{quote.quoteNumber || quote.id}</h2>
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

        {/* Picker's Note */}
        <div className="pt-3 mt-1 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Picker&apos;s Note</p>
          <p
            className={`break-words text-sm ${
              quote.pickerNote
                ? 'font-medium text-gray-800'
                : 'italic text-gray-500'
            }`}
          >
            {quote.pickerNote || 'No note provided'}
          </p>
          {quote.pickerNote && (
            <p className="mt-1 text-xs italic text-gray-400">
              {quote.pickerNote.length}/500 characters
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// =================================================================
// 4. MAIN EXPORTED COMPONENT
// =================================================================
const OrdersToCheckPage: React.FC = () => {
  const { quotes, isLoading, error, refetchQuotes } = useOrdersToCheck();

  const renderContent = () => {
    if (isLoading) {
      return <div className="p-8 text-center">Loading orders...</div>;
    }

    if (error) {
      return (
        <div
          className="mt-3 flex items-center justify-between rounded-lg border border-red-400 bg-red-100 p-4 text-red-700"
          role="alert"
        >
          <p>Failed to load orders. Please try again.</p>
          <button
            onClick={() => refetchQuotes()}
            className="rounded-full border border-red-700 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      );
    }

    if (quotes.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {quotes.map((quote) => (
          <QuoteCard quote={quote} key={quote.id} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto my-4 max-w-7xl px-4 sm:px-6 lg:px-8">
      <title>Smart Picker | Orders To Check</title>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <ClipboardCheck className="h-6 w-6 text-yellow-800" />
          </div>
          <div>
            <h1 className="mb-1 text-3xl font-bold">Orders Pending Review</h1>
            <p className="text-gray-500">
              {quotes.length > 0
                ? `${quotes.length} order${
                    quotes.length === 1 ? '' : 's'
                  } require${quotes.length === 1 ? 's' : ''} your attention`
                : 'No pending reviews'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default OrdersToCheckPage;