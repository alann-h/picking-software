import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  History,
  Check,
  ChevronsUpDown,
  ArrowRightLeft,
} from 'lucide-react';
import { uploadKyteCSV, getCustomersForMapping, createQuickBooksEstimates, getConversionHistory } from '../api/kyteConverter';
import ItemDescription from './ItemDescription';
import PortalDropdown from './PortalDropdown';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { extractErrorMessage } from '../utils/apiHelpers';

interface Customer { customerId: string; customerName: string; }
interface LineItem { quantity: number; productName: string; originalText: string; productId?: string; sku?: string; barcode?: string; externalItemId?: string; matched: boolean; }
interface Order { number: string; date: string; itemsDescription: string; total: string; customerName: string | null; customerId: string | null; lineItems: LineItem[]; }
interface ProcessingResult { orderNumber: string; success: boolean; message: string; estimateId?: string; estimateNumber?: string; quickbooksUrl?: string; }
interface ConversionHistoryItem { orderNumber: string; estimateId?: string; quickbooksUrl?: string; status: 'success' | 'failed'; errorMessage?: string; createdAt: string; }

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
    <div className="flex items-center">
      <AlertCircle className="w-5 h-5 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  </div>
);

const SuccessAlert: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
    <div className="flex items-center">
      <CheckCircle className="w-5 h-5 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  </div>
);

const WarningAlert: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg" role="alert">
    <div className="flex items-center">
      <AlertTriangle className="w-5 h-5 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  </div>
);

const KyteToQuickBooksConverter: React.FC = () => {
  const { showError, showSuccess, showWarning } = useErrorHandler();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const hasLoadedData = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conversionHistory, setConversionHistory] = useState<ConversionHistoryItem[]>([]);
  const [openDropdowns, setOpenDropdowns] = useState<{ [orderNumber: string]: boolean }>({});
  const [expandedItems, setExpandedItems] = useState<{ [orderNumber: string]: boolean }>({});
  const [showHistory, setShowHistory] = useState(false);
  const [customerQueries, setCustomerQueries] = useState<{ [orderNumber: string]: string }>({});
  const dropdownRefs = useRef<{ [orderNumber: string]: React.RefObject<HTMLDivElement | null> }>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const ITEMS_PER_PAGE = 20;

  const reloadConversionHistory = async (page: number = 1) => {
    try {
      setIsLoadingHistory(true);
      const historyResponse = await getConversionHistory(ITEMS_PER_PAGE, page) as { 
        history: ConversionHistoryItem[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalCount: number;
          limit: number;
          offset: number;
        };
      };
      
      setConversionHistory(historyResponse.history);
      setTotalPages(historyResponse.pagination.totalPages);
      setCurrentPage(historyResponse.pagination.currentPage);
    } catch (err) {
      showError(err, { operation: 'Reloading conversion history', component: 'KyteToQuickBooksConverter' });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (hasLoadedData.current) return;
      
      hasLoadedData.current = true;
      try {
        try {
          const customersResponse = await getCustomersForMapping() as { customers: Customer[] };
          setCustomers(customersResponse.customers);
        } catch (err) {
          showError(err, { operation: 'Loading customers', component: 'KyteToQuickBooksConverter' });
          setError('Failed to load customers');
        }

        try {
          await reloadConversionHistory(1);
        } catch (err) {
          showError(err, { operation: 'Loading conversion history', component: 'KyteToQuickBooksConverter' });
        }
      } catch (error) {
        console.error('Unexpected error during initial data load:', error);
      }
    };
    
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showWarning('File size must be less than 5MB');
        setError('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    } else {
      showWarning('Please select a valid CSV file');
      setError('Please select a valid CSV file');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      showWarning('Please select a file first');
      setError('Please select a file first');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const csvContent = await selectedFile.text();
      const response = await uploadKyteCSV(csvContent) as { orders: Order[] };
      setOrders(response.orders);
      const successMessage = `Successfully processed ${response.orders.length} pending orders`;
      showSuccess(successMessage);
      setSuccess(successMessage);
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to upload CSV');
      showError(err, { operation: 'Uploading CSV file', component: 'KyteToQuickBooksConverter' });
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCustomerChange = (orderNumber: string, customer: Customer | null) => {
    setOrders(prev => prev.map(order => order.number === orderNumber ? { ...order, customerId: customer?.customerId || '' } : order));
    setOpenDropdowns(prev => ({ ...prev, [orderNumber]: false }));
    setCustomerQueries(prev => ({ ...prev, [orderNumber]: customer?.customerName || '' }));
  };

  const handleCustomerQueryChange = (orderNumber: string, query: string) => {
    setCustomerQueries(prev => ({ ...prev, [orderNumber]: query }));
    if (query === '') {
      setOrders(prev => prev.map(order => order.number === orderNumber ? { ...order, customerId: '' } : order));
    }
  };

  const getDropdownRef = (orderNumber: string): React.RefObject<HTMLDivElement | null> => {
    if (!dropdownRefs.current[orderNumber]) {
      dropdownRefs.current[orderNumber] = React.createRef<HTMLDivElement | null>();
    }
    return dropdownRefs.current[orderNumber];
  };

  const toggleDropdown = (orderNumber: string) => {
    setOpenDropdowns(prev => ({ ...prev, [orderNumber]: !prev[orderNumber] }));
  };

  const toggleItemsExpansion = (orderNumber: string) => {
    setExpandedItems(prev => ({ ...prev, [orderNumber]: !prev[orderNumber] }));
  };
  
  const handleCreateEstimates = async () => {
    const unmappedOrders = orders.filter(order => !order.customerId);
    if (unmappedOrders.length > 0) {
      const errorMessage = `Please map customers for orders: ${unmappedOrders.map(o => o.number).join(', ')}`;
      showWarning(errorMessage);
      setError(errorMessage);
      return;
    }
    try {
      setProcessing(true);
      setError(null);
      const response = await createQuickBooksEstimates(orders) as { results: ProcessingResult[]; message: string };
      setResults(response.results);
      showSuccess(response.message);
      setSuccess(response.message);
      await reloadConversionHistory(currentPage);
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to create estimates');
      showError(err, { operation: 'Creating QuickBooks estimates', component: 'KyteToQuickBooksConverter' });
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const allCustomersMapped = orders.length > 0 && orders.every(order => order.customerId);

  return (
    <div className="mx-auto my-4 max-w-7xl px-4 sm:px-6 lg:px-8">
      <title>Smart Picker | Kyte Converter</title>

      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ArrowRightLeft className="h-6 w-6 text-blue-800" />
          </div>
          <div>
            <h1 className="mb-1 text-3xl font-bold">Kyte to QuickBooks Converter</h1>
            <p className="text-gray-500">
              Convert your Kyte CSV exports into QuickBooks estimates seamlessly
            </p>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div className="mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-xl font-semibold">Step 1: Upload CSV File</h3>
          <p className="mb-6 text-sm text-gray-600">Maximum file size: 5MB</p>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
              <Upload className="w-5 h-5 mr-2" />
              <span>Select CSV File</span>
              <input type="file" accept=".csv" hidden onChange={handleFileSelect} disabled={uploading} />
            </label>
            
            {selectedFile && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            )}
            
            <button 
              onClick={handleFileUpload} 
              disabled={!selectedFile || uploading} 
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md cursor-pointer hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : null}
              <span>Upload & Process</span>
            </button>
          </div>
          
          {success && <SuccessAlert message={success} />}
          {error && <ErrorAlert message={error} />}
        </div>
      </div>

      {/* Map Customers */}
      {orders.length > 0 && (
        <div className="mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-6 text-xl font-semibold">Step 2: Map Customers & Review Orders</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.number}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.number}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{order.date}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xs"><ItemDescription items={order.itemsDescription.split(',').map(item => item.trim())} maxItems={3} variant="body2" showExpandButton={true} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">${order.total}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm w-80">
                      {order.customerName && (
                        <p className="text-xs text-gray-500 mb-1">
                          Customer on kyte order: <span className="font-medium text-gray-700">{order.customerName}</span>
                        </p>
                      )}
                      <div ref={getDropdownRef(order.number)} className="relative">
                        <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                          <input
                            className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                            value={customerQueries[order.number] || customers.find(c => c.customerId === order.customerId)?.customerName || ''}
                            onChange={(event) => handleCustomerQueryChange(order.number, event.target.value)}
                            onFocus={() => setOpenDropdowns(prev => ({ ...prev, [order.number]: true }))}
                            placeholder="Search customers..."
                          />
                          <button 
                            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                            onClick={() => toggleDropdown(order.number)}
                          >
                            <ChevronsUpDown className="h-4 w-4 text-gray-400 cursor-pointer" aria-hidden="true" />
                          </button>
                        </div>
                        
                        <PortalDropdown 
                          isOpen={openDropdowns[order.number] || false} 
                          triggerRef={getDropdownRef(order.number)} 
                          setIsDropdownOpen={(open) => setOpenDropdowns(prev => ({ ...prev, [order.number]: open }))}
                          className="max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-300"
                        >
                          {customers
                            .filter((customer) =>
                                customer.customerName
                                .toLowerCase()
                                .replace(/\s+/g, '')
                                .includes((customerQueries[order.number] || '').toLowerCase().replace(/\s+/g, ''))
                            )
                            .length === 0 && customerQueries[order.number] !== '' ? (
                            <div className="relative cursor-default select-none py-1.5 px-3 text-gray-700 text-sm">
                              Nothing found.
                            </div>
                          ) : (
                            customers
                            .filter((customer) =>
                                customer.customerName
                                .toLowerCase()
                                .replace(/\s+/g, '')
                                .includes((customerQueries[order.number] || '').toLowerCase().replace(/\s+/g, ''))
                            )
                            .map((customer) => (
                              <div
                                key={customer.customerId}
                                className="group relative cursor-pointer select-none py-2 pl-8 pr-3 text-gray-900 hover:bg-gray-100 transition-colors text-sm"
                                onClick={() => handleCustomerChange(order.number, customer)}
                              >
                                <span className={`block truncate ${customers.find(c => c.customerId === order.customerId)?.customerId === customer.customerId ? 'font-medium' : 'font-normal'}`}>
                                  {customer.customerName}
                                </span>
                                {customers.find(c => c.customerId === order.customerId)?.customerId === customer.customerId ? (
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-blue-600">
                                    <Check className="h-4 w-4" />
                                  </span>
                                ) : null}
                              </div>
                            ))
                          )}
                        </PortalDropdown>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div>
                        <button 
                          className="flex items-center gap-1 text-sm text-blue-600 cursor-pointer hover:text-blue-800"
                          onClick={() => toggleItemsExpansion(order.number)}
                        >
                          {order.lineItems.length} items <ChevronDown className={`w-4 h-4 transition-transform ${expandedItems[order.number] ? 'transform rotate-180' : ''}`} />
                        </button>
                        {expandedItems[order.number] && (
                          <div className="mt-2 space-y-2">
                            {order.lineItems
                              .slice()
                              .sort((a, b) => Number(a.matched) - Number(b.matched))
                              .map((item, index) => (
                              <div key={index} className="p-2 rounded-md bg-gray-50">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.matched ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                  <p className="text-sm font-semibold">{item.quantity}x {item.productName}</p>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${item.matched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{item.matched ? 'Matched' : 'No Match'}</span>
                                </div>
                                {item.matched && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            <div className="mt-6 flex items-center gap-4">
              <button 
                onClick={handleCreateEstimates} 
                disabled={!allCustomersMapped || processing} 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md font-semibold cursor-pointer hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : null}
                Create QuickBooks Estimates
              </button>
              {!allCustomersMapped && <WarningAlert message="Please map customers for all orders before creating estimates." />}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-6 text-xl font-semibold">Processing Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result.orderNumber}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">{result.orderNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {result.success ? <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Success</span> : <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" />Failed</span>}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{result.message}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {result.success && result.quickbooksUrl && (
                        <a href={result.quickbooksUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline cursor-pointer">
                          View in QuickBooks <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* History */}
      {conversionHistory.length > 0 && (
        <div className="mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
          <button 
            className="w-full flex justify-between items-center text-left cursor-pointer"
            onClick={() => setShowHistory(!showHistory)}
          >
            <h3 className="text-xl font-semibold">Conversion History</h3>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
              <History className="w-5 h-5" /> {showHistory ? 'Hide' : 'Show'} History <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'transform rotate-180' : ''}`} />
            </div>
          </button>
          {showHistory && (
            <div className="mt-4">
              {/* Loading indicator */}
              {isLoadingHistory && (
                <div className="flex justify-center items-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm text-gray-600">Loading history...</span>
                </div>
              )}
              
              {/* History table */}
              {!isLoadingHistory && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {conversionHistory.map((item) => (
                        <tr key={`${item.orderNumber}-${item.createdAt}`}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">{item.orderNumber}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                             {item.status === 'success' ? <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Success</span> : <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" />Failed</span>}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(item.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {item.status === 'success' && item.quickbooksUrl && (
                              <a href={item.quickbooksUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline cursor-pointer">
                                View in QuickBooks <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Pagination controls */}
              {!isLoadingHistory && totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => reloadConversionHistory(currentPage - 1)}
                      disabled={currentPage === 1 || isLoadingHistory}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => reloadConversionHistory(pageNum)}
                            disabled={isLoadingHistory}
                            className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                              pageNum === currentPage
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => reloadConversionHistory(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoadingHistory}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KyteToQuickBooksConverter;