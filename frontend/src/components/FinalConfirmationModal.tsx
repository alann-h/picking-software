import React, { Fragment, useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, LoaderCircle } from 'lucide-react';
import clsx from 'clsx';
import { ProductDetail } from '../utils/types';
import { useAuth } from '../hooks/useAuth';

interface FinalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  backorderProducts: ProductDetail[];
}

const FinalConfirmationModal: React.FC<FinalConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  backorderProducts,
}) => {
  const { connectionType } = useAuth();
  const hasBackorder = backorderProducts.length > 0;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20 bg-black/30" />
      <div className="relative z-50 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
        <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2">
          {hasBackorder ? <AlertTriangle className="text-yellow-500" /> : <CheckCircle2 className="text-green-500" />}
          Confirm Invoice Finalisation
        </h3>
        <div className="mt-4">
          {hasBackorder ? (
            <>
              <div className="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50" role="alert">
                <div className="flex items-center">
                  <AlertTriangle className="flex-shrink-0 inline w-5 h-5 mr-3" />
                  <h3 className="text-lg font-medium">Backordered Items Detected</h3>
                </div>
                <div className="mt-2 ml-8 text-base">
                  You are about to finalise this quote with items on backorder. Do you wish to proceed?
                </div>
              </div>
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3.5 text-sm font-normal text-left text-gray-500">SKU</th>
                      <th scope="col" className="px-4 py-3.5 text-sm font-normal text-left text-gray-500">Product Name</th>
                      <th scope="col" className="px-4 py-3.5 text-sm font-normal text-center text-gray-500">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backorderProducts.map((product) => (
                      <tr key={product.productId}>
                        <td className="px-4 py-4 text-sm font-medium text-gray-700 whitespace-nowrap">{product.sku}</td>
                        <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{product.productName}</td>
                        <td className="px-4 py-4 text-sm text-center text-gray-500 whitespace-nowrap">{`${product.pickingQty}/${product.originalQty}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-4 text-sm text-green-800 rounded-lg bg-green-50" role="alert">
              <div className="flex items-center">
                <CheckCircle2 className="flex-shrink-0 inline w-5 h-5 mr-3" />
                <h3 className="text-lg font-medium">Ready to Finalise</h3>
              </div>
              <div className="mt-2 ml-8 text-base">
                All items are accounted for. Are you sure you want to finalise this invoice and send it to {connectionType === 'xero' ? 'Xero' : 'QuickBooks'}?
              </div>
            </div>
          )}
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
            className={clsx(
              "inline-flex justify-center items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
              hasBackorder 
                ? "bg-yellow-500 hover:bg-yellow-600 focus-visible:ring-yellow-500" 
                : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"
            )}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Processing...
              </>
            ) : (
              'Yes, Proceed'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalConfirmationModal;