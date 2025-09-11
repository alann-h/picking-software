import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Combobox, Transition, Disclosure, DisclosureButton, DisclosurePanel, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { uploadKyteCSV, getCustomersForMapping, createQuickBooksEstimates, getConversionHistory } from '../api/kyteConverter';
import ItemDescription from './ItemDescription';

// Interfaces (remain the same)
interface Customer { customerId: string; customerName: string; }
interface LineItem { quantity: number; productName: string; originalText: string; productId?: string; sku?: string; barcode?: string; price: number; externalItemId?: string; matched: boolean; }
interface Order { number: string; date: string; itemsDescription: string; total: number; customerId: string | null; lineItems: LineItem[]; }
interface ProcessingResult { orderNumber: string; success: boolean; message: string; estimateId?: string; estimateNumber?: string; quickbooksUrl?: string; }
interface ConversionHistoryItem { orderNumber: string; estimateId?: string; quickbooksUrl?: string; status: 'success' | 'failed'; errorMessage?: string; createdAt: string; }

// Reusable UI Components
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conversionHistory, setConversionHistory] = useState<ConversionHistoryItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadCustomers();
    loadConversionHistory();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await getCustomersForMapping();
      setCustomers(response.customers);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Failed to load customers');
    }
  };

  const loadConversionHistory = async () => {
    try {
      const response = await getConversionHistory(20);
      setConversionHistory(response.history);
    } catch (err) {
      console.error('Failed to load conversion history:', err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }
    try {
      setUploading(true);
      setError(null);
      const csvContent = await selectedFile.text();
      const response = await uploadKyteCSV(csvContent);
      setOrders(response.orders);
      setSuccess(`Successfully processed ${response.orders.length} pending orders`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload CSV';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCustomerChange = (orderNumber: string, customer: Customer | null) => {
    setOrders(prev => prev.map(order => order.number === orderNumber ? { ...order, customerId: customer?.customerId || '' } : order));
  };

  const filteredCustomers = query === ''
    ? customers
    : customers.filter((customer) =>
        customer.customerName
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(query.toLowerCase().replace(/\s+/g, ''))
      );

  const handleCreateEstimates = async () => {
    const unmappedOrders = orders.filter(order => !order.customerId);
    if (unmappedOrders.length > 0) {
      setError(`Please map customers for orders: ${unmappedOrders.map(o => o.number).join(', ')}`);
      return;
    }
    try {
      setProcessing(true);
      setError(null);
      const response = await createQuickBooksEstimates(orders);
      setResults(response.results);
      setSuccess(response.message);
      await loadConversionHistory();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create estimates';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const allCustomersMapped = orders.length > 0 && orders.every(order => order.customerId);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <title>Smart Picker | Kyte Converter</title>

      <div className="text-center p-6 rounded-lg text-white bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
        <h1 className="text-3xl font-bold">Smart Picker</h1>
        <h2 className="text-2xl font-light opacity-90">Kyte to QuickBooks Converter</h2>
      </div>

      {/* Step 1: Upload */}
      <div className="p-6 rounded-lg bg-white shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Step 1: Upload CSV File</h3>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700 disabled:bg-blue-300">
            <Upload className="w-5 h-5 mr-2" />
            <span>Select CSV File</span>
            <input type="file" accept=".csv" hidden onChange={handleFileSelect} disabled={uploading} />
          </label>
          {selectedFile && <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>}
          <button onClick={handleFileUpload} disabled={!selectedFile || uploading} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md cursor-pointer hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed">
            {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : null}
            <span>Upload & Process</span>
          </button>
        </div>
        {success && <SuccessAlert message={success} />}
        {error && <ErrorAlert message={error} />}
      </div>

      {/* Step 2: Map Customers */}
      {orders.length > 0 && (
        <div className="p-6 rounded-lg bg-white shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Step 2: Map Customers & Review Orders</h3>
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">${order.total.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm w-80">
                      <Combobox value={customers.find(c => c.customerId === order.customerId) || null} onChange={(customer) => handleCustomerChange(order.number, customer)}>
                        <div className="relative">
                          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                            <ComboboxInput
                              className="w-full border-none py-2.5 pl-4 pr-12 text-base leading-6 text-gray-900 focus:ring-0"
                              displayValue={(customer: Customer | null) => customer?.customerName || ''}
                              onChange={(event) => setQuery(event.target.value)}
                              placeholder="Search customers..."
                            />
                            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-4">
                              <ChevronsUpDown className="h-6 w-6 text-gray-400 cursor-pointer" aria-hidden="true" />
                            </ComboboxButton>
                          </div>
                          <Transition
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                            afterLeave={() => setQuery('')}
                          >
                            <ComboboxOptions className="absolute mt-1 max-h-72 w-full overflow-auto rounded-md bg-white py-2 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999] border border-gray-300">
                              {filteredCustomers.length === 0 && query !== '' ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                  Nothing found.
                                </div>
                              ) : (
                                filteredCustomers.map((customer) => (
                                  <ComboboxOption
                                    key={customer.customerId}
                                    className="group relative cursor-pointer select-none py-3 pl-12 pr-4 text-gray-900 data-[active]:bg-gray-100"
                                    value={customer}
                                  >
                                    {({ selected }) => (
                                      <div>
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                          {customer.customerName}
                                        </span>
                                        {selected ? (
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-blue-600 group-data-[active]:text-blue-600">
                                            <Check className="h-6 w-6" />
                                          </span>
                                        ) : null}
                                      </div>
                                    )}
                                  </ComboboxOption>
                                ))
                              )}
                            </ComboboxOptions>
                          </Transition>
                        </div>
                      </Combobox>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Disclosure>
                        {({ open }) => (
                          <div>
                            <DisclosureButton className="flex items-center gap-1 text-sm text-blue-600 cursor-pointer">
                              {order.lineItems.length} items <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'transform rotate-180' : ''}`} />
                            </DisclosureButton>
                            <DisclosurePanel className="mt-2 space-y-2">
                              {order.lineItems.map((item, index) => (
                                <div key={index} className="p-2 rounded-md bg-gray-50">
                                  <div className="flex items-center gap-2 mb-1">
                                    {item.matched ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                    <p className="text-sm font-semibold">{item.quantity}x {item.productName}</p>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${item.matched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{item.matched ? 'Matched' : 'No Match'}</span>
                                  </div>
                                  {item.matched && <p className="text-xs text-gray-500">SKU: {item.sku} | Price: ${item.price.toFixed(2)}</p>}
                                </div>
                              ))}
                            </DisclosurePanel>
                          </div>
                        )}
                      </Disclosure>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button onClick={handleCreateEstimates} disabled={!allCustomersMapped || processing} className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md font-semibold cursor-pointer hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed">
              {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : null}
              Create QuickBooks Estimates
            </button>
            {!allCustomersMapped && <WarningAlert message="Please map customers for all orders before creating estimates." />}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="p-6 rounded-lg bg-white shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Processing Results</h3>
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
      )}

      {/* History */}
      {conversionHistory.length > 0 && (
        <Disclosure as="div" className="p-6 rounded-lg bg-white shadow-sm">
          {({ open }) => (
            <div>
              <DisclosureButton className="w-full flex justify-between items-center text-left cursor-pointer">
                <h3 className="text-xl font-semibold">Conversion History</h3>
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                  <History className="w-5 h-5" /> {open ? 'Hide' : 'Show'} History <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'transform rotate-180' : ''}`} />
                </div>
              </DisclosureButton>
              <DisclosurePanel className="mt-4 overflow-x-auto">
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
              </DisclosurePanel>
            </div>
          )}
        </Disclosure>
      )}
    </div>
  );
};

export default KyteToQuickBooksConverter;
