import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRuns, updateRunDriver, updateRunItemsDetails, getLatestDriverName } from '../../api/runs';
import { getDeliveryRates, DeliveryRates } from '../../api/settings';
import { RunQuote } from '../../utils/types';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Printer, ChevronDown, Settings } from 'lucide-react';
import { useSnackbarContext } from '../SnackbarContext';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const AutoResizeTextarea: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, placeholder, className }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${className} overflow-hidden`}
            placeholder={placeholder}
            rows={1}
        />
    );
};

const PrintRunSheet: React.FC = () => {
    const { runId } = useParams<{ runId: string }>();
    const { userCompanyId } = useAuth();
    const navigate = useNavigate();
    const { handleOpenSnackbar } = useSnackbarContext();
    const queryClient = useQueryClient();

    const { data: runs, isLoading } = useQuery({
        queryKey: ['runs', userCompanyId],
        queryFn: () => getRuns(userCompanyId || ''),
        enabled: !!userCompanyId,
    });

    const run = runs?.find(r => r.id === runId);

    const [driverName, setDriverName] = useState('');
    const [items, setItems] = useState<Record<string, Partial<RunQuote>>>({});
    const [deliveryRates, setDeliveryRates] = useState<DeliveryRates | null>(null);

    useEffect(() => {
        getDeliveryRates().then(setDeliveryRates).catch(console.error);
    }, []);
    
    // Track if initial load has happened to avoid auto-saving on mount
    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (run && isInitialLoad.current) {
            // Use existing driver name if not null (allows empty string if explicitly cleared)
            if (run.driver_name !== null && run.driver_name !== undefined) {
                 setDriverName(run.driver_name);
            } else {
                 // Fetch the latest driver name if none is set for this run (null)
                 getLatestDriverName().then(response => {
                     if (response.driverName) {
                         setDriverName(response.driverName);
                     }
                 }).catch(console.error);
            }

            const initialItems: Record<string, Partial<RunQuote>> = {};
            run.quotes.forEach(q => {
                initialItems[q.quoteId] = {
                    size: q.size || '',
                    type: q.type || '',
                    deliveryCost: q.deliveryCost || 0,
                    notes: q.notes || '',
                };
            });
            setItems(initialItems);
            isInitialLoad.current = false;
        }
    }, [run]);

    const handleItemChange = (quoteId: string, field: keyof RunQuote, value: any) => {
        setItems(prev => {
            const currentItem = prev[quoteId] || {};
            const updatedItem = { ...currentItem, [field]: value };
            
            // Auto-calculate cost if size or type changes
            if ((field === 'size' || field === 'type') && deliveryRates) {
                const sizeStr = field === 'size' ? value : currentItem.size;
                const typeStr = field === 'type' ? value : currentItem.type;
                
                // Parse size: extract first number found or just parseFloat
                const quantity = parseFloat(sizeStr) || 0;
                
                let rate = 0;
                if (typeStr === 'forklift') rate = parseFloat(deliveryRates.forkliftPrice);
                if (typeStr === 'hand_unload') rate = parseFloat(deliveryRates.handUnloadPrice);
                
                // Only update if we have valid inputs for calculation
                // Note: We update even if quantity is 0 (cost becomes 0) if type is selected
                if (rate > 0 || quantity > 0) {
                     updatedItem.deliveryCost = quantity * rate;
                }
            }

            // Auto-calculate size if deliveryCost changes
            if (field === 'deliveryCost' && deliveryRates && currentItem.type) {
                const cost = parseFloat(value) || 0;
                let rate = 0;
                if (currentItem.type === 'forklift') rate = parseFloat(deliveryRates.forkliftPrice);
                if (currentItem.type === 'hand_unload') rate = parseFloat(deliveryRates.handUnloadPrice);

                if (rate > 0 && cost > 0) {
                    const calculatedSize = (cost / rate).toFixed(2);
                    // Remove .00 decimal if it's a whole number
                    updatedItem.size = calculatedSize.endsWith('.00') ? calculatedSize.slice(0, -3) : calculatedSize;
                }
            }

            return {
                ...prev,
                [quoteId]: updatedItem
            };
        });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!runId) return;
            await updateRunDriver(runId, driverName);
            const updates = Object.entries(items).map(([quoteId, details]) => ({
                quoteId,
                size: details.size,
                type: details.type,
                deliveryCost: details.deliveryCost,
                notes: details.notes
            }));
            await updateRunItemsDetails(runId, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', userCompanyId] });
        },
        onError: (error: any) => {
            handleOpenSnackbar(error?.message || 'Failed to save run details', 'error');
        }
    });

    // Debounced values for auto-save
    const debouncedDriverName = useDebounce(driverName, 1000);
    const debouncedItems = useDebounce(items, 1000);

    // Auto-save effect
    const { mutate: saveRun } = saveMutation;

    useEffect(() => {
        if (isInitialLoad.current) return;
        
        // Only save if we have data
        if (runId) {
            saveRun();
        }
    }, [debouncedDriverName, debouncedItems, runId, saveRun]);

    const handlePrint = async () => {
        // Ensure latest state is saved before printing
        await saveMutation.mutateAsync();
        window.print();
    };

    const hasNotes = useMemo(() => {
        return Object.values(items).some(i => i.notes && i.notes.trim().length > 0);
    }, [items]);

    const totalDeliveryCost = useMemo(() => {
        return Object.values(items).reduce((sum, item) => {
            const cost = typeof item.deliveryCost === 'number' ? item.deliveryCost : parseFloat(item.deliveryCost as unknown as string) || 0;
            return sum + cost;
        }, 0);
    }, [items]);

    const getColClass = (colName: string, hasNotes: boolean) => {
        const screenWidths: Record<string, string> = {
            order: 'w-24',
            customer: '', // Fluid - shares remaining space
            size: 'w-20',
            type: 'w-28',
            cost: 'w-24',
            address: '', // Fluid - shares remaining space
            signature: 'w-32',
            notes: 'w-40'
        };

        const printWidthsNoNotes: Record<string, string> = {
            order: 'print:w-[10%]',
            customer: 'print:w-[20%]',
            size: 'print:hidden',
            type: 'print:hidden',
            cost: 'print:w-[10%]',
            address: 'print:w-[30%]',
            signature: 'print:w-[25%]',
            notes: 'print:hidden'
        };

        const base = screenWidths[colName] || '';
        if (hasNotes) {
            return base;
        } else {
            return `${base} ${printWidthsNoNotes[colName] || ''}`;
        }
    };

    if (isLoading || !run) {
        return <div className="p-8 text-center">Loading run details...</div>;
    }

    return (
        <div className="bg-white min-h-screen p-8 print:p-12">
            {/* Header Controls - Hidden on Print */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 px-2 py-1 -ml-2 sm:ml-0 cursor-pointer">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back
                </button>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {saveMutation.isPending && <span className="text-xs text-gray-500 ml-auto sm:ml-0">Saving...</span>}
                    <button
                        onClick={() => navigate('/settings/rates')}
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 sm:py-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                        title="Edit Delivery Rates"
                    >
                        <Settings className="w-5 h-5 mr-2" /> Rates
                    </button>
                    <button 
                        onClick={handlePrint} 
                        className="flex-1 sm:flex-none flex items-center justify-center px-4 py-3 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                    >
                        <Printer className="w-5 h-5 mr-2" /> Print
                    </button>
                </div>
            </div>

            {/* Printable Content */}
            <div className="print:w-full overflow-x-auto pb-4 lg:overflow-visible lg:pb-0 print:overflow-visible print:pb-0">
                <div className="min-w-[1200px] lg:min-w-0 print:min-w-0">
                    <div className="flex justify-between items-start mb-8 border-b pb-4">
                        <div>
                            <h1 className="text-2xl font-bold mb-2 w-full sm:w-96 truncate">
                                {run.run_name || `Run Sheet #${run.run_number}`}
                            </h1>
                            <div className="text-gray-600">Date: {new Date().toLocaleDateString('en-AU')}</div>
                            <div className="text-gray-600">Run Created: {new Date(run.created_at).toLocaleDateString('en-AU')}</div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                            <span className="font-semibold">Driver:</span>
                            <input 
                                type="text" 
                                value={driverName}
                                onChange={(e) => setDriverName(e.target.value)}
                                className="border-b border-gray-400 px-2 py-1 w-48 sm:w-64 focus:outline-none print:border-none text-right sm:text-left"
                                placeholder="Enter driver name"
                            />
                        </div>
                    </div>

                    <table className="w-full border-collapse text-sm table-fixed">
                        <thead>
                            <tr className="bg-gray-50 print:bg-gray-100">
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider ${getColClass('order', hasNotes)}`}>Order #</th>
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider ${getColClass('customer', hasNotes)}`}>Customer Name</th>
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider print:hidden ${getColClass('size', hasNotes)}`}>Size</th>
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider print:hidden ${getColClass('type', hasNotes)}`}>Type</th>
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider ${getColClass('cost', hasNotes)}`}>Delivery Cost</th>
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider ${getColClass('address', hasNotes)}`}>Address</th>
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider ${getColClass('signature', hasNotes)}`}>Signature</th>
                                <th className={`border-b border-r border-gray-200 last:border-r-0 p-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider ${getColClass('notes', hasNotes)}`}>Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {run.quotes.map((quote) => (
                                <tr key={quote.quoteId} className="print:break-inside-avoid hover:bg-gray-50 print:hover:bg-transparent">
                                    <td className={`border-r border-gray-200 last:border-r-0 p-3 font-medium ${getColClass('order', hasNotes)}`}>
                                        <button 
                                            onClick={() => navigate(`/quote?id=${quote.quoteId}`)}
                                            className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none print:text-gray-900 print:no-underline cursor-pointer"
                                        >
                                            #{quote.quoteNumber || quote.quoteId.slice(0,8)}
                                        </button>
                                    </td>
                                    <td className={`border-r border-gray-200 last:border-r-0 p-3 text-gray-800 ${getColClass('customer', hasNotes)}`}>
                                        <div className="w-full truncate print:whitespace-normal print:overflow-visible" title={quote.customerName}>
                                            {quote.customerName}
                                        </div>
                                    </td>
                                    <td className={`border-r border-gray-200 last:border-r-0 p-3 text-gray-700 print:hidden ${getColClass('size', hasNotes)}`}>
                                        <input 
                                            type="text" 
                                            value={items[quote.quoteId]?.size || ''}
                                            onChange={(e) => handleItemChange(quote.quoteId, 'size', e.target.value)}
                                            className="w-full bg-transparent focus:outline-none print:hidden min-w-[60px]"
                                            placeholder="Size"
                                        />
                                        <span className="hidden print:block">{items[quote.quoteId]?.size}</span>
                                    </td>
                                    <td className={`border-r border-gray-200 last:border-r-0 p-0 text-gray-700 relative print:hidden ${getColClass('type', hasNotes)}`}>
                                        <div className="relative w-full h-full print:hidden min-w-[100px]">
                                            <select
                                                value={items[quote.quoteId]?.type || ''}
                                                onChange={(e) => handleItemChange(quote.quoteId, 'type', e.target.value)}
                                                className={`w-full h-full p-3 appearance-none bg-transparent focus:outline-none focus:bg-gray-50 cursor-pointer text-sm transition-colors
                                                    ${items[quote.quoteId]?.type === 'hand_unload' ? 'text-amber-700 font-medium bg-amber-50/30' : 
                                                      items[quote.quoteId]?.type === 'forklift' ? 'text-emerald-700 font-medium bg-emerald-50/30' : 'text-gray-400'}
                                                `}
                                            >
                                                <option value="" className="text-gray-400" disabled>Select Type</option>
                                                <option value="hand_unload" className="text-amber-700">Hand Unload</option>
                                                <option value="forklift" className="text-emerald-700">Forklift</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                                <ChevronDown className="h-3 w-3" />
                                            </div>
                                        </div>
                                        <span className={`hidden print:block p-3 w-full h-full text-sm font-medium
                                            ${items[quote.quoteId]?.type === 'hand_unload' ? 'text-amber-800' : 
                                              items[quote.quoteId]?.type === 'forklift' ? 'text-emerald-800' : ''}
                                        `}>
                                            {items[quote.quoteId]?.type === 'hand_unload' ? 'Hand Unload' : 
                                             items[quote.quoteId]?.type === 'forklift' ? 'Forklift' : ''}
                                        </span>
                                    </td>
                                    <td className={`border-r border-gray-200 last:border-r-0 p-3 text-right text-gray-700 ${getColClass('cost', hasNotes)}`}>
                                        <div className="print:hidden min-w-[80px]">
                                            <span className="mr-1 text-gray-500">$</span>
                                            <input 
                                                type="number" 
                                                value={items[quote.quoteId]?.deliveryCost || ''}
                                                onChange={(e) => handleItemChange(quote.quoteId, 'deliveryCost', parseFloat(e.target.value))}
                                                className="w-16 bg-transparent focus:outline-none text-right"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <span className="hidden print:block">
                                            {items[quote.quoteId]?.deliveryCost ? `$${Number(items[quote.quoteId]?.deliveryCost).toFixed(2)}` : ''}
                                        </span>
                                    </td>
                                    <td className={`border-r border-gray-200 last:border-r-0 p-3 text-xs text-gray-600 ${getColClass('address', hasNotes)}`}>
                                        <div className="w-full truncate print:whitespace-normal print:overflow-visible" title={quote.customerAddress || ''}>
                                            {quote.customerAddress || 'No address'}
                                        </div>
                                    </td>
                                    <td className={`border-r border-gray-200 last:border-r-0 p-3 h-16 ${getColClass('signature', hasNotes)}`}>
                                        {/* Blank space for signature, added height */}
                                    </td>
                                    <td className={`border-r border-gray-200 last:border-r-0 p-3 text-gray-700 ${getColClass('notes', hasNotes)}`}>
                                        <AutoResizeTextarea
                                            value={items[quote.quoteId]?.notes || ''}
                                            onChange={(val) => handleItemChange(quote.quoteId, 'notes', val)}
                                            className="w-full bg-transparent focus:outline-none resize-none print:hidden min-w-[150px]"
                                            placeholder="Add notes..."
                                        />
                                        <span className="hidden print:block whitespace-pre-wrap">{items[quote.quoteId]?.notes}</span>
                                    </td>
                                </tr>
                            ))}
                            {/* Total Row */}
                            <tr className="font-bold border-t border-gray-200">
                                <td className={`border-r border-gray-200 last:border-r-0 p-3 text-right text-gray-900 ${getColClass('order', hasNotes)}`} colSpan={2}>
                                    
                                </td>
                                {/* Hidden cells to maintain structure in screen view where size/type exist */}
                                <td className="print:hidden"></td>
                                <td className="print:hidden"></td>
                                
                                <td className={`border-r border-gray-200 last:border-r-0 p-3 text-right text-gray-900 ${getColClass('cost', hasNotes)}`}>
                                    ${totalDeliveryCost.toFixed(2)}
                                </td>
                                <td className={`border-r border-gray-200 last:border-r-0 p-3 ${getColClass('address', hasNotes)}`}></td>
                                <td className={`border-r border-gray-200 last:border-r-0 p-3 ${getColClass('signature', hasNotes)}`}></td>
                                <td className={`border-r border-gray-200 last:border-r-0 p-3 ${getColClass('notes', hasNotes)}`}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PrintRunSheet;
