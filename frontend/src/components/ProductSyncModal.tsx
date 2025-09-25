import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Package, Filter, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getCategories, syncWithCategories, syncAllProducts, Category, SyncResult } from '../api/sync';
import { useQueryClient } from '@tanstack/react-query';

interface ProductSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProductSyncModal: React.FC<ProductSyncModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'categories' | 'syncing' | 'complete'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncMode, setSyncMode] = useState<'all' | 'categories'>('all');
  
  const queryClient = useQueryClient();

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen && step === 'categories') {
      loadCategories();
    }
  }, [isOpen, step]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
    } catch (err) {
      setError('Failed to load categories from QuickBooks');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSync = async () => {
    try {
      setStep('syncing');
      setLoading(true);
      setError(null);

      let result: SyncResult;
      
      if (syncMode === 'all') {
        result = await syncAllProducts();
      } else {
        if (selectedCategories.length === 0) {
          setError('Please select at least one category to sync');
          setStep('categories');
          return;
        }
        result = await syncWithCategories(selectedCategories);
      }

      setSyncResult(result);
      setStep('complete');
      
      // Refresh products data
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
    } catch (err) {
      setError('Sync failed. Please try again.');
      setStep('categories');
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('categories');
    setSelectedCategories([]);
    setError(null);
    setSyncResult(null);
    setSyncMode('all');
    onClose();
  };

  const handleRetry = () => {
    setStep('categories');
    setError(null);
    setSyncResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Product Sync</h2>
              <p className="text-sm text-gray-500">Sync products from QuickBooks Online</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {step === 'categories' && (
            <div className="space-y-6">
              {/* Sync Mode Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Sync Options</h3>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Automatic Sync</p>
                      <p className="text-sm text-blue-700">The system automatically syncs products twice a week to keep your inventory up to date.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="syncMode"
                      value="all"
                      checked={syncMode === 'all'}
                      onChange={(e) => setSyncMode(e.target.value as 'all' | 'categories')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-medium text-gray-800">Sync All Products</span>
                      <p className="text-sm text-gray-500">Import all products from QuickBooks Online</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="syncMode"
                      value="categories"
                      checked={syncMode === 'categories'}
                      onChange={(e) => setSyncMode(e.target.value as 'all' | 'categories')}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-medium text-gray-800">Sync by Categories</span>
                      <p className="text-sm text-gray-500">Select specific categories to sync (recommended)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Category Selection */}
              {syncMode === 'categories' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Select Categories</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Filter className="h-4 w-4" />
                      <span>{selectedCategories.length} selected</span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading categories...</span>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-red-800">{error}</span>
                      </div>
                      <button
                        onClick={loadCategories}
                        className="mt-3 text-sm text-red-600 hover:text-red-800 underline cursor-pointer"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {categories.map((category) => (
                        <label
                          key={category.id}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleCategoryToggle(category.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">{category.name}</span>
                            {category.fullyQualifiedName !== category.name && (
                              <p className="text-sm text-gray-500">{category.fullyQualifiedName}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'syncing' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Syncing Products</h3>
              <p className="text-gray-500">
                {syncMode === 'all' 
                  ? 'Importing all products from QuickBooks Online...' 
                  : `Syncing products from ${selectedCategories.length} selected categories...`
                }
              </p>
              <p className="text-sm text-gray-400 mt-2">This may take a few moments</p>
            </div>
          )}

          {step === 'complete' && syncResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Sync Complete!</h3>
                <p className="text-gray-500">Products have been successfully synchronized</p>
              </div>

              {/* Results Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Sync Results</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-600">Total Products:</span>
                    <span className="font-semibold text-gray-800">{syncResult.totalProducts}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-semibold text-gray-800">{syncResult.updatedProducts}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-gray-600">New Products:</span>
                    <span className="font-semibold text-gray-800">{syncResult.newProducts}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-gray-600">Errors:</span>
                    <span className="font-semibold text-gray-800">{syncResult.errors.length}</span>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  Completed in {(syncResult.duration / 1000).toFixed(1)} seconds
                </div>
              </div>

              {/* Errors Display */}
              {syncResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Errors ({syncResult.errors.length})</h4>
                  <div className="space-y-1 text-sm text-red-700">
                    {syncResult.errors.map((error, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {step === 'categories' && 'Select sync options and categories'}
            {step === 'syncing' && 'Please wait while products are syncing...'}
            {step === 'complete' && 'Sync completed successfully'}
          </div>
          <div className="flex items-center space-x-3">
            {step === 'complete' && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Sync Again
              </button>
            )}
            <button
              onClick={handleClose}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                step === 'categories' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              )}
              disabled={step === 'syncing'}
            >
              {step === 'categories' ? 'Start Sync' : step === 'syncing' ? 'Syncing...' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSyncModal;
