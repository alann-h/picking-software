import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package as InventoryIcon,
  Truck as ShippingIcon,
  FileText as AssignmentIcon,
  QrCode as QrCodeIcon,
  X as CloseIcon,
  Info as InfoIcon,
  Edit3 as EditIcon,
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
  const navigate = useNavigate();
  const [localProductDetails, setLocalProductDetails] = useState(productDetails);

  useEffect(() => {
    setLocalProductDetails(productDetails);
  }, [productDetails]);

  const handleEditProduct = () => {
    // Navigate to settings with the product SKU as search term
    navigate(`/settings/products?search=${encodeURIComponent(localProductDetails.sku)}`);
    onClose(); // Close the modal
  };

  const getQuantityProgress = () => {
    if (!localProductDetails.originalQty) return 0;
    const completedQty = localProductDetails.pickingStatus === 'completed' ? localProductDetails.originalQty : 0;
    const percentage = (completedQty / localProductDetails.originalQty) * 100;
    return Math.min(percentage, 100);
  };

  const getQuantityColorClasses = () => {
    if (localProductDetails.pickingStatus === 'completed') {
      return { bg: 'bg-green-500', text: 'text-green-700' };
    }
    if (localProductDetails.pickingStatus === 'backorder') {
      return { bg: 'bg-orange-500', text: 'text-orange-700' };
    }
    if (localProductDetails.pickingStatus === 'unavailable') {
      return { bg: 'bg-red-500', text: 'text-red-700' };
    }
    // pending or default
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 bg-black/30" />
      <div className="relative z-50 w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-4 sm:p-6 text-left align-middle shadow-xl transition-all cursor-default max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between text-lg font-medium leading-6 text-gray-900 cursor-default mb-4">
          <div className="flex items-start gap-2 flex-1 pr-2">
            <InventoryIcon className="h-6 w-6 sm:h-7 sm:w-7 text-gray-700 flex-shrink-0 mt-0.5" />
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 break-words leading-tight">{productName}</h3>
          </div>
        </div>
        
        <div className="mt-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="space-y-3 rounded-lg border border-gray-200 p-3">
              <h4 className="text-md font-semibold text-gray-800">Basic Information</h4>
              <div className="flex items-start gap-4">
                <AssignmentIcon className="h-6 w-6 text-gray-600 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase">SKU</p>
                  <p className="font-mono text-gray-900">{localProductDetails.sku}</p>
                </div>
                <button
                  onClick={handleEditProduct}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                  title="Edit product in settings"
                >
                  <EditIcon className="h-3 w-3" />
                  Edit
                </button>
              </div>
              <div className="flex items-start gap-4">
                <QrCodeIcon className="h-6 w-6 text-gray-600 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase">Barcode</p>
                  <p className="font-mono text-gray-900">{localProductDetails.barcode || 'No barcode assigned'}</p>
                </div>
                <button
                  onClick={handleEditProduct}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                  title="Edit barcode in settings"
                >
                  <EditIcon className="h-3 w-3" />
                  Edit
                </button>
              </div>
            </div>

            {/* Quantity Details */}
            <div className="space-y-3 rounded-lg border border-gray-200 p-3">
              <h4 className="text-md font-semibold text-gray-800">Quantity Details</h4>
              <div className="flex items-start gap-4">
                <InventoryIcon className="h-6 w-6 text-gray-600 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase">On Hand</p>
                  <p className="font-semibold text-lg text-gray-900">{localProductDetails.quantityOnHand}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <InfoIcon className="h-4 w-4 text-gray-600" />
                    <h4 className="text-sm font-semibold text-gray-800 capitalize">{localProductDetails.pickingStatus || 'Unknown'}</h4>
                </div>
                <div className="text-right">
                    <span className={`font-bold text-sm ${quantityColorClasses.text}`}>
                        {localProductDetails.pickingStatus === 'completed' ? localProductDetails.originalQty : 0}
                    </span>
                    <span className="text-gray-500 text-xs"> / {localProductDetails.originalQty}</span>
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 relative overflow-hidden mt-1">
                <div 
                    className={`h-full rounded-full ${quantityColorClasses.bg}`} 
                    style={{ width: '100%', transition: 'width 0.3s ease-in-out' }}
                />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-gray-800 px-6 py-2 text-md font-medium text-white hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 cursor-pointer w-full sm:w-auto"
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