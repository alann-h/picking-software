import React, { Fragment, useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react';
import clsx from 'clsx';
import { ProductDetail, QuoteData } from '../utils/types';

interface QuoteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData;
  onProceed: () => void;
  isLoading: boolean;
}

const QuoteInvoiceModal: React.FC<QuoteInvoiceModalProps> = ({
  isOpen,
  onClose,
  quoteData,
  onProceed,
  isLoading,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const productsToReview = React.useMemo(() => {
    if (!quoteData?.productInfo) return [];
    return Object.values(quoteData.productInfo).filter((product) =>
      ['pending', 'backorder', 'unavailable'].includes(product.pickingStatus)
    );
  }, [quoteData]);

  const hasPendingProducts = React.useMemo(() => {
    return productsToReview.some((product) => product.pickingStatus === 'pending');
  }, [productsToReview]);

  const handleProceed = () => {
    onProceed();
    // Close the modal after proceeding
    onClose();
  };

  const getStatusChipClasses = (status: string): string => {
    switch (status) {
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      case 'backorder':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderContent = () => {
    if (productsToReview.length > 0) {
      const displayedProducts = productsToReview.slice(0, 10);
      const remainingCount = productsToReview.length - 10;
      
      return (
        <>
          <div className="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50" role="alert">
            <div className="flex items-center">
              <AlertTriangle className="flex-shrink-0 inline w-5 h-5 mr-3" />
              <span className="sr-only">Warning</span>
              <h3 className="text-lg font-medium">Attention Required</h3>
            </div>
            <div className="mt-2 ml-8 text-base">
              The following products have statuses that need review. Please resolve any
              <strong className="font-semibold"> 'pending' </strong> items before you can proceed.
            </div>
          </div>
          {/* Desktop View */}
          <div className="hidden md:block overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500">SKU</th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500">Product Name</th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-normal text-center text-gray-500">Quantity</th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-normal text-center text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedProducts.map((product: ProductDetail) => (
                  <tr key={product.productId}>
                    <td className="px-4 py-4 text-sm font-medium text-gray-700 whitespace-nowrap">{product.sku}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{product.productName}</td>
                    <td className="px-4 py-4 text-sm text-center text-gray-500 whitespace-nowrap">{`${product.pickingQty}/${product.originalQty}`}</td>
                    <td className="px-4 py-4 text-sm font-medium text-center whitespace-nowrap">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                        getStatusChipClasses(product.pickingStatus)
                      )}>
                        {product.pickingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {displayedProducts.map((product: ProductDetail) => (
              <div key={product.productId} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-start gap-2 mb-2">
                   <div className="text-sm font-medium text-gray-900 break-words">{product.productName}</div>
                   <span className={clsx(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize shrink-0",
                      getStatusChipClasses(product.pickingStatus)
                    )}>
                      {product.pickingStatus}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                     <span className="text-gray-400">SKU:</span>
                     <span className="font-mono text-gray-700">{product.sku}</span>
                  </div>
                  <div className="font-medium bg-gray-50 px-2 py-0.5 rounded">
                     Qty: {product.pickingQty}/{product.originalQty}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {remainingCount > 0 && (
            <div className="mt-3 p-3 text-sm text-gray-700 bg-gray-100 rounded-lg">
              <p className="font-medium">
                Showing 10 of {productsToReview.length} items ({remainingCount} more not displayed)
              </p>
            </div>
          )}
        </>
      );
    }
    return (
        <div className="p-4 text-sm text-green-800 rounded-lg bg-green-50" role="alert">
            <div className="flex items-center">
                <CheckCircle2 className="flex-shrink-0 inline w-5 h-5 mr-3" />
                <span className="sr-only">Success</span>
                <h3 className="text-lg font-medium">Ready to Go!</h3>
            </div>
            <div className="mt-2 ml-8 text-base">
                All products have been checked and are ready for admin review.
            </div>
        </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20 bg-black/30" />
      <div className="relative z-10 w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
        <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
          <AlertTriangle className="text-blue-600" />
          Review Before Sending To Admin
        </h3>
        <div className="mt-4">
          {renderContent()}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed cursor-pointer"
            onClick={handleProceed}
            disabled={hasPendingProducts || isLoading}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Processing...
              </>
            ) : (
              'Confirm & Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteInvoiceModal;