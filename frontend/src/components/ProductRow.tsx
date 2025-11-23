import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Eye, Edit, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import Portal from './Portal';
import { ProductDetail } from '../utils/types';
import { getStatusColor } from '../utils/other';
import { useQuoteManager } from './useQuote';

type QuoteManagerActions = ReturnType<typeof useQuoteManager>['actions'];
type QuoteManagerPendingStates = ReturnType<typeof useQuoteManager>['pendingStates'];

interface ProductRowProps {
  product: ProductDetail;
  actions: QuoteManagerActions;
  pendingStates: QuoteManagerPendingStates;
  isMobile?: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  actions,
  pendingStates,
  isMobile = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const handleProductClick = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    actions.openProductDetailsModal(product.productId, product);
  };

  const calculateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192;
      const menuHeight = 270;

      const left = rect.right + window.scrollX - menuWidth;
      let top = rect.bottom + window.scrollY + 4;

      if (rect.bottom + menuHeight + 20 > window.innerHeight) {
        top = rect.top + window.scrollY - menuHeight - 4;
      }
      
      setMenuPosition({ top, left });
    }
  };

  const toggleMenu = () => {
    if (!isMenuOpen) {
      calculateMenuPosition();
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu on outside click
  useEffect(() => {
    const handleInteraction = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleInteraction);

    return () => {
      document.removeEventListener('mousedown', handleInteraction);
    };
  }, [isMenuOpen]);

  // No need to show loading spinners - optimistic updates handle it!
  // We still disable buttons during operations to prevent double-clicks
  const isAnyActionLoading = Object.values(pendingStates).some(status => status);

  const getQuantityColorClass = () => {
    // Priority 1: Check picking status for special cases
    if (product.pickingStatus === 'unavailable') {
      return 'text-red-600 font-bold';
    }
    if (product.pickingStatus === 'backorder') {
      return 'text-orange-500 font-bold';
    }
    
    // Priority 2: Default quantity-based coloring
    if (product.pickingQty === product.originalQty) {
      return 'text-green-600 font-bold';
    } else if (product.pickingQty > 0) {
      return 'text-yellow-600 font-bold';
    }
    return 'text-gray-500';
  };

  const getStatusIcon = () => {
    switch (product.pickingStatus) {
      case 'completed':
        return <CheckCircle size={14} className="text-white" />;
      case 'pending':
        return <Clock size={14} className="text-white" />;
      case 'backorder':
        return <AlertTriangle size={14} className="text-white" />;
      case 'unavailable':
        return <AlertTriangle size={14} className="text-white" />;
      default:
        return null;
    }
  };

  // Mobile card view
  if (isMobile) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <button
              onClick={handleProductClick}
              className="text-left text-base font-semibold text-blue-600 hover:text-blue-700 active:text-blue-800 underline decoration-1 underline-offset-2 mb-1 block w-full"
            >
              {product.productName}
            </button>
            <span className="text-sm font-mono font-medium text-gray-600 block">
              SKU: {product.sku}
            </span>
          </div>
          <div className="relative flex-shrink-0">
            <button
              ref={buttonRef}
              onClick={toggleMenu}
              disabled={isAnyActionLoading}
              className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={isAnyActionLoading ? "Action in progress..." : "Product actions"}
            >
              <MoreVertical size={18} />
            </button>
            
            {isMenuOpen && (
              <Portal>
                <div
                  ref={menuRef}
                  className="absolute z-50 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                  style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        actions.openProductDetailsModal(product.productId, product);
                        setIsMenuOpen(false);
                      }}
                      className="group flex w-full items-center px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                    >
                      <Eye className="mr-3 h-4 w-4 text-gray-400" />
                      View Details
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        actions.openAdjustQuantityModal(product.productId, product.pickingQty, product.productName);
                        setIsMenuOpen(false);
                      }}
                      disabled={product.pickingStatus === 'completed'}
                      className="group flex w-full items-center px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Edit className="mr-3 h-4 w-4 text-gray-400" />
                      Adjust Quantity
                    </button>
                    <button
                      onClick={() => {
                        actions.saveForLater(product.productId);
                        setIsMenuOpen(false);
                      }}
                      disabled={product.pickingStatus === 'completed'}
                      className="group flex w-full items-center px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Clock className="mr-3 h-4 w-4 text-gray-400" />
                      {product.pickingStatus === 'backorder' ? 'Set to Pending' : 'Save for Later'}
                    </button>
                    <button
                      onClick={() => {
                        actions.setUnavailable(product.productId);
                        setIsMenuOpen(false);
                      }}
                      disabled={product.pickingStatus === 'completed'}
                      className={`group flex w-full items-center px-4 py-3 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                        product.pickingStatus === 'unavailable' ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      {product.pickingStatus === 'unavailable' ? (
                        <CheckCircle className="mr-3 h-4 w-4 text-blue-400" />
                      ) : (
                        <AlertTriangle className="mr-3 h-4 w-4 text-red-400" />
                      )}
                      {product.pickingStatus === 'unavailable' ? 'Set as Available' : 'Set Unavailable'}
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        actions.setFinished(product.productId);
                        setIsMenuOpen(false);
                      }}
                      disabled={product.pickingStatus === 'completed'}
                      className="group flex w-full items-center px-4 py-3 text-sm text-green-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <CheckCircle className="mr-3 h-4 w-4 text-green-400" />
                      Mark as Finished
                    </button>
                  </div>
                </div>
              </Portal>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`text-base font-semibold ${getQuantityColorClass()}`}>
              {Number(product.pickingQty || 0).toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">
              / {Number(product.originalQty || 0).toFixed(1)}
            </span>
          </div>
          <span 
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white capitalize ${getStatusColor(product.pickingStatus)}`}
            title={`Current picking status: ${product.pickingStatus}`}
          >
            {getStatusIcon()}
            {product.pickingStatus}
          </span>
        </div>
      </div>
    );
  }

  // Desktop table row view
  return (
    <tr className="hover:bg-gray-50 transition-all duration-200 ease-in-out group">
      <td className="px-3 py-4 w-[15%] min-w-[100px]">
        <span className="text-sm font-mono font-medium text-gray-600 break-all">
          {product.sku}
        </span>
      </td>
      <td className="px-3 py-4 w-[35%] min-w-[150px]">
        <button
          onClick={handleProductClick}
          className="text-left text-sm md:text-base font-semibold text-blue-600 hover:text-blue-700 active:text-blue-800 underline decoration-1 underline-offset-2 hover:decoration-2 active:bg-blue-50 transition-all duration-200 cursor-pointer select-none leading-tight rounded px-1 -ml-1"
        >
          {product.productName}
        </button>
      </td>
      <td className="px-3 py-4 w-[22%] min-w-[140px]">
        <div className="flex items-center gap-1">
          <span className={`text-sm font-semibold ${getQuantityColorClass()}`}>
            {Number(product.pickingQty || 0).toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">
            / {Number(product.originalQty || 0).toFixed(1)}
          </span>
        </div>
      </td>
      <td className="px-3 py-4 w-[18%] min-w-[90px]">
        <div className="flex">
          <span 
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white capitalize ${getStatusColor(product.pickingStatus)}`}
            title={`Current picking status: ${product.pickingStatus}`}
          >
            {getStatusIcon()}
            {product.pickingStatus}
          </span>
        </div>
      </td>
      <td className="px-2 py-4 w-[10%]">
        <div className="relative inline-block text-left">
          <button
            ref={buttonRef}
            onClick={toggleMenu}
            disabled={isAnyActionLoading}
            className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title={isAnyActionLoading ? "Action in progress..." : "Product actions"}
          >
            <MoreVertical size={16} />
          </button>
          
          {isMenuOpen && (
            <Portal>
              <div
                ref={menuRef}
                className="absolute z-50 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      actions.openProductDetailsModal(product.productId, product);
                      setIsMenuOpen(false);
                    }}
                    className="group flex w-full items-center px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                  >
                    <Eye className="mr-3 h-4 w-4 text-gray-400" />
                    View Details
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      actions.openAdjustQuantityModal(product.productId, product.pickingQty, product.productName);
                      setIsMenuOpen(false);
                    }}
                    disabled={product.pickingStatus === 'completed'}
                    className="group flex w-full items-center px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Edit className="mr-3 h-4 w-4 text-gray-400" />
                    Adjust Quantity
                  </button>
                  <button
                    onClick={() => {
                      actions.saveForLater(product.productId);
                      setIsMenuOpen(false);
                    }}
                    disabled={product.pickingStatus === 'completed'}
                    className="group flex w-full items-center px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Clock className="mr-3 h-4 w-4 text-gray-400" />
                    {product.pickingStatus === 'backorder' ? 'Set to Pending' : 'Save for Later'}
                  </button>
                  <button
                    onClick={() => {
                      actions.setUnavailable(product.productId);
                      setIsMenuOpen(false);
                    }}
                    disabled={product.pickingStatus === 'completed'}
                    className={`group flex w-full items-center px-4 py-3 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                      product.pickingStatus === 'unavailable' ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    {product.pickingStatus === 'unavailable' ? (
                      <CheckCircle className="mr-3 h-4 w-4 text-blue-400" />
                    ) : (
                      <AlertTriangle className="mr-3 h-4 w-4 text-red-400" />
                    )}
                    {product.pickingStatus === 'unavailable' ? 'Set as Available' : 'Set Unavailable'}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      actions.setFinished(product.productId);
                      setIsMenuOpen(false);
                    }}
                    disabled={product.pickingStatus === 'completed'}
                    className="group flex w-full items-center px-4 py-3 text-sm text-green-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckCircle className="mr-3 h-4 w-4 text-green-400" />
                    Mark as Finished
                  </button>
                </div>
              </div>
            </Portal>
          )}
        </div>
      </td>
    </tr>
  );
};

export default React.memo(ProductRow);