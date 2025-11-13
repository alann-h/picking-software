import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, Package, Loader2, Users } from 'lucide-react';
import clsx from 'clsx';
import { syncAllProducts, SyncResult } from '../api/sync';
import { useQueryClient } from '@tanstack/react-query';

interface ProductSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProductSyncModal: React.FC<ProductSyncModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'confirm' | 'syncing' | 'complete'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  
  const queryClient = useQueryClient();

  const handleSync = async () => {
    try {
      setStep('syncing');
      setLoading(true);
      setError(null);

      const result = await syncAllProducts();
      setSyncResult(result);
      setStep('complete');
      
      // Refresh products data
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
    } catch (err) {
      setError('Sync failed. Please try again.');
      setStep('confirm');
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setError(null);
    setSyncResult(null);
    onClose();
  };

  const handleRetry = () => {
    setStep('confirm');
    setError(null);
    setSyncResult(null);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

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
              <p className="text-sm text-gray-500">Sync products from your accounting system</p>
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
          {step === 'confirm' && (
            <div className="space-y-6">
              {/* Sync Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Sync All Products</h3>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Automatic Sync</p>
                      <p className="text-sm text-blue-700">The system automatically syncs every 3.5 days (twice per week). Use this for immediate syncing.</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-800">What will be synced:</p>
                      <p className="text-sm text-gray-600">All customers and products from your accounting system (QuickBooks/Xero)</p>
                    </div>
                  </div>
                </div>
              </div>

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
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Syncing Data</h3>
              <p className="text-gray-500">Importing customers and products from your accounting system...</p>
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
                  {syncResult.totalCustomers !== undefined && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="text-gray-600">Customers:</span>
                      <span className="font-semibold text-gray-800">{syncResult.totalCustomers}</span>
                    </div>
                  )}
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
            {step === 'confirm' && 'Ready to sync all products'}
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
              onClick={step === 'confirm' ? handleSync : handleClose}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                step === 'confirm' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              )}
              disabled={step === 'syncing'}
            >
              {step === 'confirm' ? 'Start Sync' : step === 'syncing' ? 'Syncing...' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSyncModal;
