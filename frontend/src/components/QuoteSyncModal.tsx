import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { syncAllQuotes, QuoteSyncResult } from '../api/sync';
import { useQueryClient } from '@tanstack/react-query';

interface QuoteSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuoteSyncModal: React.FC<QuoteSyncModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'confirm' | 'syncing' | 'complete'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<QuoteSyncResult | null>(null);
  
  const queryClient = useQueryClient();

  const handleSync = async () => {
    try {
      setStep('syncing');
      setLoading(true);
      setError(null);

      const result = await syncAllQuotes();
      setSyncResult(result);
      setStep('complete');
      
      // Refresh quotes data
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      
    } catch (err) {
      setError('Sync failed. Please try again.');
      setStep('confirm');
      console.error('Quote sync error:', err);
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Quote Sync</h2>
              <p className="text-sm text-gray-500">Sync pending quotes from QuickBooks/Xero</p>
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
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Sync All Pending Quotes</h3>
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <RefreshCw className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-purple-800 font-medium">Webhook Sync</p>
                      <p className="text-sm text-purple-700">New and updated quotes are automatically synced via webhooks. Use this for initial setup or to catch any missed quotes.</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-800">What will be synced:</p>
                      <p className="text-sm text-gray-600">All pending quotes from your accounting system that are not already in your database</p>
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
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Syncing Quotes</h3>
              <p className="text-gray-500">Importing pending quotes from your accounting system...</p>
              <p className="text-sm text-gray-400 mt-2">This may take a few moments</p>
            </div>
          )}

          {step === 'complete' && syncResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Sync Complete</h3>
                <p className="text-gray-500">Quote synchronization has been completed</p>
              </div>

              {/* Sync Results */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{syncResult.syncedCount}</p>
                  <p className="text-sm text-green-700">Synced</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">{syncResult.skippedCount}</p>
                  <p className="text-sm text-gray-700">Skipped</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{syncResult.failedCount}</p>
                  <p className="text-sm text-red-700">Failed</p>
                </div>
              </div>

              {/* Duration */}
              <div className="text-center text-sm text-gray-500">
                Completed in {(syncResult.duration / 1000).toFixed(2)} seconds
              </div>

              {/* Errors */}
              {syncResult.errors && syncResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Errors:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <ul className="space-y-1 text-sm text-red-700">
                      {syncResult.errors.map((error, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            {error.customerName && <strong>{error.customerName}: </strong>}
                            {error.quoteId && <span className="text-red-600">Quote #{error.quoteId} - </span>}
                            {error.error}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          {step === 'confirm' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSync}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Sync
              </button>
            </>
          )}
          
          {step === 'complete' && (
            <>
              {syncResult && !syncResult.success && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all"
                >
                  Retry
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer transition-all"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuoteSyncModal;

