import React, { Suspense, useMemo, useState, useTransition } from 'react';
import {
  Receipt,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  ChevronRight,
  Check,
  X,
  Settings,
  FileText,
  Clock,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Customer, QuoteSummary, Run, RunQuote, QuoteWithBackorders } from '../utils/types';
import { getCustomers } from '../api/customers';
import { getCustomerQuotes, getQuotesWithStatus, getQuotesWithBackorders } from '../api/quote';
import { getRuns } from '../api/runs';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { AvailableQuotesSkeleton, RunListSkeleton } from './Skeletons';
import { useAuth } from '../hooks/useAuth';
import PortalDropdown from './PortalDropdown';

// ====================================================================================
// Reusable & Child Components
// ====================================================================================

const statusColors: { [key: string]: { bg: string; text: string; border?: string } } = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-800' },
    preparing: { bg: 'bg-orange-100', text: 'text-orange-800' },
    checking: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    completed: { bg: 'bg-green-100', text: 'text-green-800' },
    assigned: { bg: 'bg-sky-100', text: 'text-sky-800' },
    default: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const RunStatusChip: React.FC<{ status: Run['status'] }> = ({ status }) => {
    const color = statusColors[status] || statusColors.default;
    return (
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${color.bg} ${color.text}`}>
            {status}
        </span>
    );
};

const QuoteStatusChip: React.FC<{ status: RunQuote['orderStatus'] }> = ({ status }) => {
    const colorKey = status === 'assigned' ? 'assigned' : status;
    const color = statusColors[colorKey] || statusColors.default;
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${color.bg} ${color.text}`}>
            {status}
        </span>
    );
};

const DashboardRunItem: React.FC<{ run: Run; backorderQuoteIds?: Set<string> }> = ({ run, backorderQuoteIds }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);
    const navigate = useNavigate();
    const { quoteCount, completedQuotes, progressPercentage, hasBackorders } = useMemo(() => {
        const quotes = run.quotes || [];
        const completed = quotes.filter(quote => quote.orderStatus === 'completed' || quote.orderStatus === 'checking').length;
        const total = quotes.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const backorders = quotes.some(quote => backorderQuoteIds?.has(quote.quoteId));
        
        return { 
            quoteCount: total, 
            completedQuotes: completed,
            progressPercentage: percentage,
            hasBackorders: backorders
        };
    }, [run.quotes, backorderQuoteIds]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {run.run_name ? `${run.run_name}` : `Run #${run.run_number || run.id.substring(0, 8)}`}
                            </h3>
                            {hasBackorders && (
                                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800" title="This run has orders with backorder items">
                                    <Package className="w-3 h-3" />
                                    Items to Add
                                </span>
                            )}
                        </div>
                        {run.run_name && (
                            <p className="text-sm text-gray-500">Run #{run.run_number || run.id.substring(0, 8)}</p>
                        )}
                    </div>
                    <RunStatusChip status={run.status} />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-sm font-medium text-gray-600">{completedQuotes}/{quoteCount} quotes</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out" 
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                        <span className="text-xs text-gray-500">{progressPercentage}% complete</span>
                    </div>
                    <button aria-label="expand run">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500 cursor-pointer" /> : <ChevronDown className="w-5 h-5 text-gray-500 cursor-pointer" />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="overflow-hidden">
                    <div className="border-t border-gray-200 p-4">
                        <h4 className="text-md font-semibold text-gray-700 mb-3">Quotes in this Run</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {run.quotes
                                          ?.sort((a, b) => a.priority - b.priority)
                                          .map((quote: RunQuote) => (
                                              <tr 
                                                  key={quote.quoteId} 
                                                  onClick={() => {
                                                      setLoadingQuoteId(quote.quoteId);
                                                      navigate(`/quote?id=${quote.quoteId}`);
                                                  }} 
                                                  className={`hover:bg-gray-50 ${loadingQuoteId === quote.quoteId ? 'opacity-50 cursor-wait' : 'cursor-pointer'} transition-colors duration-150`}
                                              >
                                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                                      <div className="flex items-center gap-2">
                                                          #{quote.quoteNumber || quote.quoteId}
                                                          {backorderQuoteIds?.has(quote.quoteId) && (
                                                              <span title="Has backorder items">
                                                                  <Package className="w-3.5 h-3.5 text-amber-600" />
                                                              </span>
                                                          )}
                                                          {loadingQuoteId === quote.quoteId && (
                                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                                          )}
                                                      </div>
                                                  </td>
                                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{quote.customerName}</td>
                                                  <td className="px-4 py-3 whitespace-nowrap"><QuoteStatusChip status={quote.orderStatus} /></td>
                                              </tr>
                                          ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

const QuoteItem: React.FC<{ quote: QuoteSummary; onClick: () => void; isLoading: boolean }> = ({ quote, onClick, isLoading }) => {
    return (
        <div onClick={isLoading ? undefined : onClick} className={`w-full bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-400 ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'} transition-all duration-200 ease-in-out flex items-center justify-between`}>
            <div className="flex items-center">
                <div className="mr-4">
                    <p className="text-sm font-semibold text-blue-600">#{quote.quoteNumber || quote.id}</p>
                </div>
                <div>
                    <p className="font-medium text-gray-800">{quote.customerName}</p>
                    <p className="text-xs text-gray-500">Last Modified: {new Date(quote.lastModified).toLocaleDateString()}</p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="font-semibold text-gray-800">${quote.totalAmount.toFixed(2)}</p>
                </div>
                {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
            </div>
        </div>
    );
};

// ====================================================================================
// Data-Fetching Components
// ====================================================================================

const InfoBox: React.FC<{ icon: React.ElementType, title: string, message: string }> = ({ icon: Icon, title, message }) => (
    <div className="text-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
        <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-800">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
);

const StatsCards: React.FC<{ runs: Run[] }> = ({ runs }) => {
    const stats = useMemo(() => {
        const totalRuns = runs.length;
        const activeRuns = runs.filter(run => run.status !== 'completed').length;
        const totalQuotes = runs.reduce((sum, run) => sum + (run.quotes?.length || 0), 0);
        const completedQuotes = runs.reduce((sum, run) => 
            sum + (run.quotes?.filter(quote => quote.orderStatus === 'completed' || quote.orderStatus === 'checking').length || 0), 0
        );
        
        return {
            totalRuns,
            activeRuns,
            totalQuotes,
            completedQuotes,
            completionRate: totalQuotes > 0 ? Math.round((completedQuotes / totalQuotes) * 100) : 0
        };
    }, [runs]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <Zap className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Runs</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.totalRuns}</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <Building2 className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Active Runs</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.activeRuns}</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <Receipt className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Quotes</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.totalQuotes}</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <Check className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Completed</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.completedQuotes}</p>
                        <p className="text-xs text-gray-500">{stats.completionRate}% completion rate</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ActiveRunsList: React.FC<{ runs: Run[]; backorderQuoteIds?: Set<string> }> = ({ runs, backorderQuoteIds }) => {
    const activeRuns = useMemo(() => {
        return (runs || []).filter(run => run.status !== 'completed');
    }, [runs]);

    if (activeRuns.length === 0) return (
        <InfoBox icon={Zap} title="No active runs found" message="Create a new run to get started with order picking." />
    );

    return (
      <div className="space-y-3">
        {activeRuns.map((run) => (
          <div key={run.id}>
            <DashboardRunItem run={run} backorderQuoteIds={backorderQuoteIds} />
          </div>
        ))}
      </div>
    );
};

const QuoteList: React.FC<{ customer: Customer }> = ({ customer }) => {
    const navigate = useNavigate();
    const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);
    
    const { data: quotes } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId],
        queryFn: async () => {
            const response = await getCustomerQuotes(customer.customerId) as QuoteSummary[];
            return response;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes - quotes don't change that often
        gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    });

     if (quotes.length === 0) {
        return (
            <InfoBox icon={Receipt} title="No quotes found for this customer" message="Create a new quote to get started." />
        );
    }

    const handleQuoteClick = (quoteId: string) => {
        setLoadingQuoteId(quoteId);
        navigate(`/quote?id=${quoteId}`);
    };

    return (
        <div className="space-y-2">
            {quotes.map((quote) => (
                <div key={quote.id}>
                    <QuoteItem 
                        quote={quote} 
                        onClick={() => handleQuoteClick(quote.id)} 
                        isLoading={loadingQuoteId === quote.id}
                    />
                </div>
            ))}
        </div>
    );
};

const BackorderItemsSection: React.FC = () => {
    const navigate = useNavigate();
    const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);
    const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

    const { data: backorderQuotes = [] } = useSuspenseQuery<QuoteWithBackorders[]>({
        queryKey: ['quotes', 'backorders'],
        queryFn: async () => {
            const response = await getQuotesWithBackorders() as QuoteWithBackorders[];
            return response;
        },
        staleTime: 2 * 60 * 1000, // Cache for 2 minutes
        gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
        refetchInterval: 30000, // Refetch every 30 seconds to keep data fresh
    });

    if (backorderQuotes.length === 0) {
        return (
            <InfoBox icon={Package} title="No backorder items" message="All items have been picked or no backorders exist." />
        );
    }

    const handleQuoteClick = (quoteId: string) => {
        setLoadingQuoteId(quoteId);
        navigate(`/quote?id=${quoteId}`);
    };

    return (
        <div className="space-y-3">
            {backorderQuotes.map((quote) => {
                const isExpanded = expandedQuoteId === quote.quoteId;
                const hasMultipleRuns = quote.runs.length > 1;
                const primaryRun = quote.runs[0];

                return (
                    <div key={quote.quoteId} className="bg-white border border-amber-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 
                                            onClick={() => handleQuoteClick(quote.quoteId)}
                                            className="text-lg font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                                        >
                                            #{quote.quoteNumber || quote.quoteId}
                                        </h3>
                                        <QuoteStatusChip status={quote.orderStatus} />
                                        {loadingQuoteId === quote.quoteId && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-gray-700 font-medium">{quote.customerName}</p>
                                    
                                    {primaryRun && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                {primaryRun.runName || `Run #${primaryRun.runNumber}`}
                                            </span>
                                            {hasMultipleRuns && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                                    +{quote.runs.length - 1} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
                                            <Package className="w-4 h-4" />
                                            {quote.backorderItems.length} {quote.backorderItems.length === 1 ? 'item' : 'items'} to add
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setExpandedQuoteId(isExpanded ? null : quote.quoteId)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                        aria-label="Toggle items"
                                    >
                                        {isExpanded ? (
                                            <ChevronUp className="w-5 h-5 text-gray-500" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-amber-100">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        Items to Add Later:
                                    </h4>
                                    <div className="space-y-2">
                                        {quote.backorderItems.map((item) => (
                                            <div 
                                                key={item.productId} 
                                                className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                                                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-semibold text-amber-700">
                                                        {item.pickingQuantity} / {item.originalQuantity}
                                                    </span>
                                                    <p className="text-xs text-gray-500">remaining</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const RecentQuotesList: React.FC = () => {
    const navigate = useNavigate();
    const [loadingQuoteId, setLoadingQuoteId] = useState<string | null>(null);
    const [displayCount, setDisplayCount] = useState(9);
    
    const { data: allQuotes = [] } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', 'recent-pending'],
        queryFn: async () => {
            const response = await getQuotesWithStatus('pending') as QuoteSummary[];
            return response;
        },
        staleTime: 2 * 60 * 1000, // Cache for 2 minutes
        gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
        refetchInterval: 60000, // Refetch every minute to keep data fresh
    });

    const recentQuotes = allQuotes?.slice(0, displayCount) || [];
    const hasMore = recentQuotes.length > displayCount;

    if (recentQuotes.length === 0) {
        return (
            <InfoBox icon={FileText} title="No pending quotes" message="All quotes have been processed or no quotes are available." />
        );
    }

    const handleQuoteClick = (quoteId: string) => {
        setLoadingQuoteId(quoteId);
        navigate(`/quote?id=${quoteId}`);
    };

    const handleLoadMore = () => {
        setDisplayCount(prev => prev + 9);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentQuotes.map((quote) => (
                    <div 
                        key={quote.id}
                        onClick={loadingQuoteId === quote.id ? undefined : () => handleQuoteClick(quote.id)}
                        className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-400 ${loadingQuoteId === quote.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'} transition-all duration-200 group`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-semibold text-blue-600">#{quote.quoteNumber || quote.id}</span>
                            </div>
                            <QuoteStatusChip status={quote.orderStatus as RunQuote['orderStatus']} />
                        </div>
                        
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{quote.customerName}</p>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <p className="text-xs text-gray-500">{quote.timeStarted?.split(',')[0] || 'N/A'}</p>
                                </div>
                                {loadingQuoteId === quote.id ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
                    >
                        <ChevronDown className="w-4 h-4" />
                        Load More ({recentQuotes.length - displayCount} remaining)
                    </button>
                </div>
            )}
        </div>
    );
};

// ====================================================================================
// Main Dashboard Component
// ====================================================================================
const Dashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { userCompanyId, isAdmin } = useAuth();

    const { data: customers } = useSuspenseQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: async () => {
            const response = await getCustomers() as Customer[];
            return response;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: allRuns } = useSuspenseQuery<Run[]>({
        queryKey: ['runs', userCompanyId],
        queryFn: async () => {
            const response = await getRuns(userCompanyId!) as Run[];
            return response;
        },
        refetchInterval: 20000,
        refetchIntervalInBackground: false,
        staleTime: 15000, // 15 seconds - data considered fresh
    });

    const { data: backorderQuotes = [] } = useSuspenseQuery<QuoteWithBackorders[]>({
        queryKey: ['quotes', 'backorders'],
        queryFn: async () => {
            const response = await getQuotesWithBackorders() as QuoteWithBackorders[];
            return response;
        },
        staleTime: 2 * 60 * 1000, // Cache for 2 minutes
        gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const backorderQuoteIds = useMemo(() => {
        return new Set(backorderQuotes.map(quote => quote.quoteId));
    }, [backorderQuotes]);

    const selectedCustomer = useMemo(() => {
        const customerId = searchParams.get('customer');
        if (!customerId) return null;
        return customers.find(c => c.customerId === customerId) || null;
    }, [customers, searchParams]);

    const handleCustomerChange = (customer: Customer | null) => {
        startTransition(() => {
            setSearchParams(customer ? { customer: customer.customerId } : {});
        });
        setQuery('');
        setIsDropdownOpen(false);
    };

    const filteredCustomers =
        query === ''
            ? customers
            : customers.filter((customer) =>
                customer.customerName
                    .toLowerCase()
                    .replace(/\s+/g, '')
                    .includes(query.toLowerCase().replace(/\s+/g, ''))
            );

    return (
        <div className="min-h-screen bg-gray-50/50">
            <title>Smart Picker | Dashboard</title>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* Header Section */}
                    <div>
                        <div className="text-center sm:text-left">
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                              Dashboard
                            </h1>
                            <p className="mt-3 text-lg text-gray-600">
                              Manage your picking runs and customer quotes.
                            </p>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 animate-pulse">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                    <div className="ml-4">
                                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                                        <div className="h-6 bg-gray-200 rounded w-12"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>}>
                        <StatsCards runs={allRuns || []} />
                    </Suspense>

                    {/* Active Runs Section */}
                    <div>
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-6 h-6 text-blue-600" />
                                        <h2 className="text-xl font-semibold text-gray-800">
                                            Active Picking Runs
                                        </h2>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => navigate('/run')}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Manage Runs
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 sm:p-5">
                                <Suspense fallback={<RunListSkeleton />}>
                                    <ActiveRunsList runs={allRuns || []} backorderQuoteIds={backorderQuoteIds} />
                                </Suspense>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-b border-gray-200" />

                    {/* Backorder Items Section */}
                    {backorderQuotes.length > 0 && (
                        <>
                            <div>
                                <div className="bg-white border border-amber-200 rounded-lg shadow-sm">
                                    <div className="p-4 sm:p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Package className="w-6 h-6 text-amber-600" />
                                                <div>
                                                    <h2 className="text-xl font-semibold text-gray-800">
                                                        Items to Add Later
                                                    </h2>
                                                    <p className="text-sm text-gray-600 mt-0.5">
                                                        Orders with backorder items (butter, cold items, etc.)
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full">
                                                <AlertTriangle className="w-4 h-4 text-amber-700" />
                                                <span className="text-sm font-semibold text-amber-700">
                                                    {backorderQuotes.length} {backorderQuotes.length === 1 ? 'order' : 'orders'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-5">
                                        <Suspense fallback={
                                            <div className="space-y-3">
                                                {[...Array(3)].map((_, i) => (
                                                    <div key={i} className="bg-white border border-amber-200 rounded-lg p-4 animate-pulse">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                                                                <div className="h-4 bg-gray-200 rounded w-48"></div>
                                                            </div>
                                                            <div className="h-5 w-5 bg-gray-200 rounded"></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        }>
                                            <BackorderItemsSection />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-b border-gray-200" />
                        </>
                    )}

                    {/* Recent Quotes Section */}
                    <div>
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-gray-50">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-6 h-6 text-purple-600" />
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-800">
                                            Recent Quotes from QuickBooks
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-0.5">
                                            Latest pending quotes ready to be picked
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 sm:p-5">
                                <Suspense fallback={
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                                                    <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                                                        <div className="h-5 w-5 bg-gray-200 rounded"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }>
                                    <RecentQuotesList />
                                </Suspense>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-b border-gray-200" />

                    {/* Quote Finder Section */}
                    <div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center sm:text-left">
                                Quote Finder
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Customer Selection */}
                                <div className="md:col-span-1">
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                            <h3 className="text-lg font-semibold text-gray-800">Select Customer</h3>
                                        </div>
                                        <div ref={triggerRef} className="relative">
                                            <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                                                <input
                                                    className="w-full border-none py-2 pl-3 pr-16 text-sm leading-5 text-gray-900 focus:ring-0"
                                                    value={selectedCustomer?.customerName || query}
                                                    onChange={(e) => {
                                                        setQuery(e.target.value);
                                                        if (selectedCustomer) handleCustomerChange(null);
                                                        setIsDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setIsDropdownOpen(true)}
                                                    placeholder="Search customers..."
                                                />
                                                {selectedCustomer && (
                                                    <button 
                                                        className="absolute inset-y-0 right-8 flex items-center pr-1"
                                                        onClick={() => handleCustomerChange(null)}
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
                                                {filteredCustomers.length === 0 && query !== '' ? (
                                                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                        Nothing found.
                                                    </div>
                                                ) : (
                                                    filteredCustomers.map((customer) => (
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
                                </div>

                                {/* Quotes Display */}
                                <div className="md:col-span-2">
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-h-[24rem]">
                                        <div className="p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <DollarSign className="w-5 h-5 text-green-600" />
                                                <h3 className="text-lg font-semibold text-gray-800">
                                                    {selectedCustomer ? `Quotes for ${selectedCustomer.customerName}` : 'Select a Customer'}
                                                </h3>
                                            </div>
                                            
                                            {isPending && (
                                                <div className="w-full flex flex-col items-center justify-center pt-10">
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div className="bg-blue-600 h-1.5 rounded-full animate-pulse"></div>
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-600">Loading quotes...</p>
                                                </div>
                                            )}
                                            
                                            {!isPending && selectedCustomer ? (
                                                <Suspense fallback={<AvailableQuotesSkeleton/>}>
                                                    <QuoteList customer={selectedCustomer} />
                                                </Suspense>
                                            ) : !isPending && !selectedCustomer ? (
                                                <InfoBox icon={Search} title="No Customer Selected" message="Choose a customer from the dropdown to view their available quotes." />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;