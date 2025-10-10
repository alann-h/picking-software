import React, { useState, useEffect, Fragment } from 'react';
import {
  Package as InventoryIcon,
  Truck as ShippingIcon,
  FileText as AssignmentIcon,
  QrCode as QrCodeIcon,
  X as CloseIcon,
  Info as InfoIcon,
} from 'lucide-react';
import { ProductDetail } from '../utils/types';

interface ProductDetailsProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productDetails: ProductDetail;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  open,
  onClose,
  productName,
  productDetails,
}) => {
  const [localProductDetails, setLocalProductDetails] = useState(productDetails);

  useEffect(() => {
    setLocalProductDetails(productDetails);
  }, [productDetails]);

  const getQuantityProgress = () => {
    if (!localProductDetails.originalQty) return 0;
    const percentage = (localProductDetails.pickingQty / localProductDetails.originalQty) * 100;
    return Math.min(percentage, 100);
  };

  const getQuantityColorClasses = () => {
    if (localProductDetails.pickingQty === localProductDetails.originalQty) {
      return { bg: 'bg-green-500', text: 'text-green-700' };
    }
    if (localProductDetails.pickingQty > 0) {
      return { bg: 'bg-yellow-400', text: 'text-yellow-700' };
    }
    return { bg: 'bg-gray-300', text: 'text-gray-700' };
  };
  
  const getStatusClasses = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'not started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  const quantityColorClasses = getQuantityColorClasses();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30 bg-black/30" />
      <div className="relative z-50 w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all cursor-default">
        <div className="flex items-center justify-between text-lg font-medium leading-6 text-gray-900 cursor-default mb-6">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <InventoryIcon className="h-6 w-6 text-gray-700 flex-shrink-0" />
            <h3 className="text-xl font-semibold truncate">{productName}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer flex-shrink-0 ml-2"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mt-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4 rounded-lg border border-gray-200 p-4">
              <h4 className="text-lg font-semibold text-gray-800">Basic Information</h4>
              <div className="flex items-start gap-4">
                <AssignmentIcon className="h-6 w-6 text-gray-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">SKU</p>
                  <p className="font-mono text-gray-900">{localProductDetails.sku}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <QrCodeIcon className="h-6 w-6 text-gray-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">Barcode</p>
                  <p className="font-mono text-gray-900">{localProductDetails.barcode || 'No barcode assigned'}</p>
                </div>
              </div>
            </div>

            {/* Quantity Details */}
            <div className="space-y-4 rounded-lg border border-gray-200 p-4">
              <h4 className="text-lg font-semibold text-gray-800">Quantity Details</h4>
              <div className="flex items-start gap-4">
                <InventoryIcon className="h-6 w-6 text-gray-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">On Hand</p>
                  <p className="font-semibold text-lg text-gray-900">{localProductDetails.quantityOnHand}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ShippingIcon className="h-6 w-6 text-gray-600 mt-1" />
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase">Picking Progress</p>
                    <div className="flex items-baseline gap-1">
                        <p className={`font-semibold text-lg ${quantityColorClasses.text}`}>
                        {localProductDetails.pickingQty}
                        </p>
                        <p className="text-sm text-gray-500">/ {localProductDetails.originalQty}</p>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2">
              <InfoIcon className="h-6 w-6 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-800">Current Status</h4>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusClasses(localProductDetails.pickingStatus)}`}>
                  {localProductDetails.pickingStatus || 'N/A'}
              </span>
            </div>
            <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1 text-right">{getQuantityProgress().toFixed(1)}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${quantityColorClasses.bg}`} style={{ width: `${getQuantityProgress()}%`, transition: 'width 0.3s ease-in-out' }}></div>
                </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-800 px-6 py-2 text-md font-medium text-white hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;