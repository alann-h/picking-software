import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, DollarSign, Package, TrendingUp, Download } from 'lucide-react';
import { getRunReports } from '../../api/runs';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

type TimeRange = 'today' | 'week' | 'month' | 'custom';

const RunReports: React.FC = () => {
    const navigate = useNavigate();
    const { userCompanyId } = useAuth();
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const getDateRange = () => {
        const now = new Date();
        switch (timeRange) {
            case 'today':
                return { start: startOfDay(now), end: endOfDay(now) };
            case 'week':
                return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
            case 'month':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'custom':
                return { 
                    start: startOfDay(new Date(customStartDate)), 
                    end: endOfDay(new Date(customEndDate)) 
                };
            default:
                return { start: startOfWeek(now), end: endOfWeek(now) };
        }
    };

    const { start, end } = getDateRange();

    const { data: reportData, isLoading, isError } = useQuery({
        queryKey: ['runReports', userCompanyId, timeRange, customStartDate, customEndDate],
        queryFn: () => getRunReports(start.toISOString(), end.toISOString()),
        enabled: !!userCompanyId,
        staleTime: 60000, // Cache for 1 minute
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <button 
                            onClick={() => navigate('/dashboard')} 
                            className="mb-2 flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-slate-900">Run Reports</h1>
                        <p className="mt-1 text-slate-500">Overview of transport performance and costs.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
                            {(['today', 'week', 'month', 'custom'] as TimeRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                                        timeRange === range
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>

                        {timeRange === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <span className="text-slate-400">to</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                        <div className="flex flex-col items-center gap-2 animate-pulse">
                            <div className="h-8 w-8 rounded-full bg-blue-100"></div>
                            <span className="text-sm font-medium text-slate-500">Loading report data...</span>
                        </div>
                    </div>
                ) : isError ? (
                     <div className="rounded-xl bg-red-50 p-6 text-center text-red-600 ring-1 ring-red-100">
                        <p>Failed to load reports. Please try again later.</p>
                     </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid gap-6 sm:grid-cols-3">
                            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Runs</span>
                                </div>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-slate-900">{reportData.summary.totalRuns}</span>
                                    <p className="mt-1 text-sm text-slate-500">Total completed runs</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                        <DollarSign className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Cost</span>
                                </div>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-slate-900">{formatCurrency(reportData.summary.totalCost)}</span>
                                    <p className="mt-1 text-sm text-slate-500">Total delivery cost</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                                        <Package className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Orders</span>
                                </div>
                                <div className="mt-4">
                                    <span className="text-3xl font-bold text-slate-900">{reportData.summary.totalItems}</span>
                                    <p className="mt-1 text-sm text-slate-500">Total orders delivered</p>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                            <div className="border-b border-slate-200 px-6 py-4">
                                <h3 className="text-base font-semibold text-slate-900">Daily Breakdown</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Date</th>
                                            <th className="px-6 py-3 font-medium text-right">Runs</th>
                                            <th className="px-6 py-3 font-medium text-right">Orders</th>
                                            <th className="px-6 py-3 font-medium text-right">Total Cost</th>
                                            <th className="px-6 py-3 font-medium text-right">Avg. Cost / Run</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.dailyBreakdown.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                    No data available for this period.
                                                </td>
                                            </tr>
                                        ) : (
                                            reportData.dailyBreakdown.map((day: any) => (
                                                <tr key={day.date} className="hover:bg-slate-50">
                                                    <td className="px-6 py-3 font-medium text-slate-900">
                                                        {format(new Date(day.date), 'EEE, d MMM yyyy')}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-slate-600">{day.runsCount}</td>
                                                    <td className="px-6 py-3 text-right text-slate-600">{day.itemCount}</td>
                                                    <td className="px-6 py-3 text-right font-medium text-slate-900">
                                                        {formatCurrency(day.totalCost)}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-slate-600">
                                                        {day.runsCount > 0 
                                                            ? formatCurrency(day.totalCost / day.runsCount) 
                                                            : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RunReports;
