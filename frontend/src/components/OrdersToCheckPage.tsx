import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CircleDollarSign,
  Clock,
  User as PreparerIcon,
  CheckCircle2 as CheckIcon,
  TrendingUp,
} from 'lucide-react';

// Context and API Imports
import { useSnackbarContext } from './SnackbarContext';
import { getQuotesWithStatus } from '../api/quote';
import { getUserStatus } from '../api/user';
import { QuoteSummary } from '../utils/types';

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
      <div className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        <PreparerIcon className="mr-1.5 h-4 w-4" />
        Not started
      </div>
    );
  }

  if (preparers.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
          {preparers[0].charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium">{preparers[0]}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {preparers.slice(0, 3).map((preparer, index) => (
          <div
            key={index}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
          >
            {preparer.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-sm font-medium">{preparers.length} preparers</span>
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

  // Use the formatted date from backend directly
  const timeAgo = quote.lastModified;

  return (
    <div
      onClick={handleQuoteClick}
      className="h-full cursor-pointer rounded-lg border border-gray-200 bg-white transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-xl"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-2xl font-bold text-blue-600">#{quote.quoteNumber}</h2>
        </div>

        {/* Customer Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{quote.customerName}</h3>
        </div>

        {/* Details Grid */}
        <div className="space-y-6">
          {/* Amount */}
          <div className="flex items-center gap-3">
            <CircleDollarSign className="h-6 w-6 text-green-500" />
            <span className="text-xl font-bold text-green-600">
              ${quote.totalAmount.toFixed(2)}
            </span>
          </div>

          {/* Preparers */}
          <div className="flex items-center gap-3">
            <PreparerIcon className="h-6 w-6 text-gray-500" />
            <PreparerAvatars preparers={preparerNames} />
          </div>

          {/* Time Taken */}
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-gray-500" />
            <div>
              <p className="mb-0.5 text-sm text-gray-500">Time Taken</p>
              <p className="text-base font-medium">{quote.timeTaken}</p>
            </div>
          </div>

          {/* Picker's Note */}
          <div className="flex items-start gap-3">
            <PreparerIcon className="mt-0.5 h-6 w-6 text-gray-500" />
            <div className="flex-1">
              <p className="mb-0.5 text-sm text-gray-500">Picker's Note</p>
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

          {/* Last Modified */}
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-gray-500" />
            <p className="text-base text-gray-500">{timeAgo}</p>
          </div>
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
            <TrendingUp className="h-6 w-6 text-yellow-800" />
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