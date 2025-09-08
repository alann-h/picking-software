import React, { Suspense, useMemo, useState, useTransition, Fragment } from 'react';
import {
  Receipt,
  Search,
  Zap,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Customer, QuoteSummary, Run, RunQuote } from '../utils/types';
import { getCustomers } from '../api/customers';
import { getCustomerQuotes } from '../api/quote';
import { getRuns } from '../api/runs';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { AvailableQuotesSkeleton, RunListSkeleton } from './Skeletons';
import { useAuth } from '../hooks/useAuth';
import { Combobox, Transition, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';

// ====================================================================================
// Reusable & Child Components
// ====================================================================================

const AnimatedComponent: React.FC<{ children: React.ReactNode; delay?: number; }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}>
    {children}
  </motion.div>
);

const statusColors: { [key: string]: { bg: string; text: string; border?: string } } = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-800' },
    checking: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    finalised: { bg: 'bg-green-100', text: 'text-green-800' },
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

const DashboardRunItem: React.FC<{ run: Run }> = ({ run }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();
    const { quoteCount } = useMemo(() => ({ quoteCount: (run.quotes || []).length }), [run.quotes]);

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Run #{run.run_number || run.id.substring(0, 8)}
                    </h3>
                    <RunStatusChip status={run.status} />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600">{quoteCount} quotes</span>
                    <button aria-label="expand run">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500 cursor-pointer" /> : <ChevronDown className="w-5 h-5 text-gray-500 cursor-pointer" />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-gray-200 p-4">
                            <h4 className="text-md font-semibold text-gray-700 mb-3">Quotes in this Run</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {run.quotes
                                          ?.sort((a, b) => a.priority - b.priority)
                                          .map((quote: RunQuote) => (
                                              <tr key={quote.quoteId} onClick={() => navigate(`/quote?id=${quote.quoteId}`)} className="hover:bg-gray-50 cursor-pointer transition-colors duration-150">
                                                  <td className="px-4 py-3 whitespace-nowrap">
                                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                          {quote.priority + 1}
                                                      </span>
                                                  </td>
                                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">#{quote.quoteNumber}</td>
                                                  <td className="px-4 py-3 whitespace-nowrap"><QuoteStatusChip status={quote.orderStatus} /></td>
                                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{quote.customerName}</td>
                                              </tr>
                                          ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const QuoteItem: React.FC<{ quote: QuoteSummary; onClick: () => void }> = ({ quote, onClick }) => {
    return (
        <div onClick={onClick} className="w-full bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md hover:border-blue-400 cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-between">
            <div className="flex items-center">
                <div className="mr-4">
                    <p className="text-sm font-semibold text-blue-600">#{quote.quoteNumber}</p>
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
                <ChevronRight className="w-5 h-5 text-gray-400" />
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

const ActiveRunsList: React.FC = () => {
    const { userCompanyId } = useAuth();
    const { data: allRuns } = useSuspenseQuery<Run[]>({
        queryKey: ['runs', userCompanyId],
        queryFn: () => getRuns(userCompanyId!),
    });

    const activeRuns = useMemo(() => {
        return (allRuns || []).filter(run => run.status !== 'finalised');
    }, [allRuns]);

    if (activeRuns.length === 0) return (
        <InfoBox icon={Zap} title="No active runs found" message="Create a new run to get started with order picking." />
    );

    return (
      <div className="space-y-3">
        {activeRuns.map((run, index) => (
          <AnimatedComponent key={run.id} delay={index * 0.1}>
            <DashboardRunItem run={run} />
          </AnimatedComponent>
        ))}
      </div>
    );
};

const QuoteList: React.FC<{ customer: Customer }> = ({ customer }) => {
    const navigate = useNavigate();
    const { data: quotes } = useSuspenseQuery<QuoteSummary[]>({
        queryKey: ['quotes', customer.customerId],
        queryFn: () => getCustomerQuotes(customer.customerId),
    });

     if (quotes.length === 0) {
        return (
            <InfoBox icon={Receipt} title="No quotes found for this customer" message="Create a new quote to get started." />
        );
    }

    return (
        <div className="space-y-2">
            {quotes.map((quote, index) => (
                <AnimatedComponent key={quote.id} delay={index * 0.05}>
                    <QuoteItem quote={quote} onClick={() => navigate(`/quote?id=${quote.id}`)} />
                </AnimatedComponent>
            ))}
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

    const { data: customers } = useSuspenseQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: getCustomers,
    });

    const selectedCustomer = useMemo(() => {
        const customerId = searchParams.get('customer');
        if (!customerId) return null;
        return customers.find(c => c.customerId === customerId) || null;
    }, [customers, searchParams]);

    const handleCustomerChange = (customer: Customer | null) => {
        startTransition(() => {
            setSearchParams(customer ? { customer: customer.customerId } : {});
        });
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
                    <AnimatedComponent>
                        <div className="text-center sm:text-left">
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                              Dashboard
                            </h1>
                            <p className="mt-3 text-lg text-gray-600">
                              Manage your picking runs and customer quotes.
                            </p>
                        </div>
                    </AnimatedComponent>

                    {/* Active Runs Section */}
                    <AnimatedComponent delay={0.1}>
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-xl font-semibold text-gray-800">
                                        Active Picking Runs
                                    </h2>
                                </div>
                            </div>
                            <div className="p-4 sm:p-5">
                                <Suspense fallback={<RunListSkeleton />}>
                                    <ActiveRunsList />
                                </Suspense>
                            </div>
                        </div>
                    </AnimatedComponent>

                    {/* Divider */}
                    <div className="border-b border-gray-200" />

                    {/* Quote Finder Section */}
                    <AnimatedComponent delay={0.2}>
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
                                        <Combobox value={selectedCustomer} onChange={handleCustomerChange}>
                                            <div className="relative">
                                                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                                                    <ComboboxInput
                                                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                                                        displayValue={(customer: Customer | null) => customer?.customerName || ''}
                                                        onChange={(event) => setQuery(event.target.value)}
                                                        placeholder="Search customers..."
                                                    />
                                                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                        <ChevronDown className="h-5 w-5 text-gray-400 cursor-pointer" aria-hidden="true" />
                                                    </ComboboxButton>
                                                </div>
                                                <Transition
                                                    as={Fragment}
                                                    leave="transition ease-in duration-100"
                                                    leaveFrom="opacity-100"
                                                    leaveTo="opacity-0"
                                                    afterLeave={() => setQuery('')}
                                                >
                                                    <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                                                        {filteredCustomers.length === 0 && query !== '' ? (
                                                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                                Nothing found.
                                                            </div>
                                                        ) : (
                                                            filteredCustomers.map((customer) => (
                                                                <ComboboxOption
                                                                    key={customer.customerId}
                                                                    className="group relative cursor-pointer select-none py-2 pl-10 pr-4 text-gray-900 data-[active]:bg-blue-600 data-[active]:text-white"
                                                                    value={customer}
                                                                >
                                                                    {({ selected }) => (
                                                                        <>
                                                                            <span className={`block truncate ${ selected ? 'font-medium' : 'font-normal' }`}>
                                                                                {customer.customerName}
                                                                            </span>
                                                                            {selected ? (
                                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 group-data-[active]:text-white">
                                                                                </span>
                                                                            ) : null}
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
                    </AnimatedComponent>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;