import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Camera, Receipt, Barcode, ExternalLink } from 'lucide-react';

import BarcodeListener from './BarcodeListener';
import CameraScannerModal from './CameraScannerModal';
import ProductDetailsQuote from './ProductDetailsQuote';
import AdjustQuantityModal from './AdjustQuantityModal';
import AddProductModal from './AddProductModal';
import ProductRow from './ProductRow';
import ProductFilter from './ProductFilter';
import QuoteInvoiceModal from './QuoteInvoiceModal';
import FinalConfirmationModal from './FinalConfirmationModal';
import BarcodeModal from './BarcodeModal';
import { useModalState } from '../utils/modalState';
import { useAuth } from '../hooks/useAuth';
import { useQuoteManager } from './useQuote';
import { getStatusColor } from '../utils/other';

const useQuery = () => new URLSearchParams(useLocation().search);

const Quote: React.FC = () => {
  const query = useQuery();
  const quoteId = query.get('id') || '';
  const { modalState, closeModal, openModal } = useModalState();
  const { isAdmin, connectionType } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { quoteData, actions, pendingStates } = useQuoteManager(quoteId, openModal);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pickerNote, setPickerNote] = useState(quoteData?.pickerNote || '');

  // Barcode mode is now automatically managed by BarcodeListener
  // No need for manual keyboard listeners

  const productArray = useMemo(() => Object.values(quoteData.productInfo), [quoteData.productInfo]);

  const displayedProducts = useMemo(() => {
    let products = [...productArray];
    if (searchTerm) {
      products = products.filter(p => 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pickingStatus.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    

    products.sort((a, b) => {
      const statusPriority: Record<string, number> = {
        'pending': 1,
        'backorder': 2,
        'unavailable': 3,
        'completed': 4,
      };
      
      const statusA = statusPriority[a.pickingStatus] || 999;
      const statusB = statusPriority[b.pickingStatus] || 999;
      
      // First sort by status priority
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      // If status is the same, sort by SKU alphabetically
      return a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    return products;
  }, [productArray, searchTerm]);

  const { hasPendingProducts, backorderProducts } = useMemo(() => {
    const pending = productArray.some(p => p.pickingStatus === 'pending');
    const backorder = productArray.filter(p => p.pickingStatus === 'backorder');
    return { hasPendingProducts: pending, backorderProducts: backorder };
  }, [productArray]);

  const handleMainActionClick = () => {
    if (quoteData.orderStatus === 'checking') {
      if (hasPendingProducts) {
        openModal('quoteInvoice');
      } else {
        openModal('finalConfirmation');
      }
    } else {
      openModal('quoteInvoice');
    }
  };
  
  const handleSaveNote = () => {
    actions.saveNote(pickerNote);
  };

  const handleCameraScanSuccess = useCallback((barcode: string) => {
    closeModal();
    actions.handleBarcodeScan(barcode);
  }, [closeModal, actions]); 


  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6 m-2 sm:m-4">
      <title>{`Smart Picker | Quote: ${quoteData.quoteNumber || quoteId}`}</title>
      
      {/* Modals now receive actions directly from the hook */}
      <BarcodeListener onBarcodeScanned={actions.handleBarcodeScan} disabled={modalState.isOpen} />
      
      {modalState.type === 'barcodeModal' && modalState.data && <BarcodeModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={modalState.data.onConfirm} availableQty={modalState.data.availableQty} productName={modalState.data.productName} />}
      {modalState.type === 'cameraScanner' && <CameraScannerModal isOpen={modalState.isOpen} onClose={closeModal} onScanSuccess={handleCameraScanSuccess} />}
      {modalState.type === 'productDetails' && modalState.data && <ProductDetailsQuote open={modalState.isOpen} onClose={closeModal} productName={modalState.data.name} productDetails={modalState.data.details} />}
      {modalState.type === 'adjustQuantity' && modalState.data && <AdjustQuantityModal isOpen={modalState.isOpen} onClose={closeModal} productName={modalState.data.productName} currentQty={quoteData.productInfo[modalState.data.productId]?.pickingQty ?? modalState.data.pickingQty} productId={modalState.data.productId} onConfirm={actions.adjustQuantity} isLoading={pendingStates.isAdjustingQuantity} />}
      {modalState.type === 'addProduct' && <AddProductModal open={modalState.isOpen} onClose={closeModal} onSubmit={actions.addProduct} isSubmitting={pendingStates.isAddingProduct}/>}
      {modalState.type === 'quoteInvoice' && <QuoteInvoiceModal isOpen={modalState.isOpen} onClose={closeModal} quoteData={quoteData} onProceed={() => actions.setQuoteChecking('checking')} isLoading={pendingStates.isQuoteChecking} />}
      {modalState.type === 'finalConfirmation' && <FinalConfirmationModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={actions.finaliseInvoice} backorderProducts={backorderProducts} isLoading={pendingStates.isFinalising} />}
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-600">
            Quote no.{quoteData.quoteNumber || quoteId}
          </h1>
          
          {/* Progress Indicator */}
          <div className="mt-2 flex items-center gap-4">
            {(() => {
              const totalPicked = productArray.reduce((sum, p) => sum + Number(p.pickingQty), 0);
              const totalOriginal = productArray.reduce((sum, p) => sum + Number(p.originalQty), 0);
              const progressPercentage = totalOriginal > 0 ? (totalPicked / totalOriginal) * 100 : 0;
              
              return (
                <>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300 relative">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {totalPicked}/{totalOriginal} boxes • {Math.round(progressPercentage)}%
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 items-center">
          {/* Customer Name */}
          <div className="text-center sm:text-left">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">
              Customer
            </span>
            <h3 className="text-lg font-semibold text-blue-600">
              {quoteData.customerName}
            </h3>
          </div>
          
          {/* Order Status */}
          <div className="text-center sm:text-left">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">
              Status
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white capitalize ${getStatusColor(quoteData.orderStatus)}`}>
              {quoteData.orderStatus}
            </span>
          </div>

          {/* Last Modified */}
          <div className="text-center sm:text-left">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-1">
              Last Modified
            </span>
            <p className="text-sm font-medium text-gray-900">
              {quoteData.lastModified}
            </p>
          </div>
        </div>
      </div>

      {/* External Sync URL - Only show for finalized orders */}
      {quoteData.orderStatus === 'finalised' && quoteData.externalSyncUrl && (
        <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200 shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <ExternalLink className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Order has been synced to {quoteData.externalSyncUrl.includes('xero.com') ? 'Xero' : 'QuickBooks'}
            </span>
            <a
              href={quoteData.externalSyncUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              View in {quoteData.externalSyncUrl.includes('xero.com') ? 'Xero' : 'QuickBooks'}
            </a>
          </div>
        </div>
      )}
      
      {/* Actions and Filters */}
      <div className="mb-4">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
          <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Customer/Sales Note
          </h4>
          <p className="text-sm text-gray-900 italic">
            {quoteData.orderNote || 'No note provided.'}
          </p>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            {!modalState.isOpen && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <Barcode size={16} />
                <span className="font-medium">Barcode Scanner Active</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 items-center">
            <button 
              onClick={() => openModal('cameraScanner')} 
              disabled={quoteData.orderStatus === 'finalised'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Camera size={18} />
              <span className="hidden sm:inline">Scan</span>
            </button>
            <button 
              onClick={actions.openAddProductModal} 
              disabled={quoteData.orderStatus === 'finalised'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Product</span>
            </button>
          </div>
        </div>
        
        <ProductFilter searchTerm={searchTerm} onSearchChange={(e) => setSearchTerm(e.target.value)} />
        
        {/* Product Table */}
        <div ref={scrollContainerRef} className="overflow-x-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">Picking Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedProducts.map((product) => (
                  <ProductRow
                    key={product.productId}
                    product={product}
                    actions={actions}
                    pendingStates={pendingStates}
                    scrollContainerRef={scrollContainerRef}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Picker's Note */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Picker&apos;s Note</h3>
          <textarea 
            placeholder="Add any notes about preparing this order..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={pickerNote} 
            onChange={(e) => setPickerNote(e.target.value)} 
            disabled={quoteData.orderStatus === 'finalised'}
          />
          <div className="flex justify-end mt-2">
            <button 
              onClick={handleSaveNote} 
              disabled={pendingStates.isSavingNote || pickerNote === (quoteData?.pickerNote || '') || quoteData.orderStatus === 'finalised'}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {pendingStates.isSavingNote ? 'Saving...' : "Save Picker's Note"}
            </button>
          </div>
        </div>

        {/* Final Action Button */}
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
          <button 
            onClick={handleMainActionClick} 
            disabled={quoteData.orderStatus === 'finalised' || !isAdmin || pendingStates.isFinalising}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium cursor-pointer"
          >
            <Receipt size={20} />
            {pendingStates.isFinalising ? 'Processing...' : (quoteData.orderStatus === 'checking' ? `Send To ${connectionType === 'xero' ? 'Xero' : 'QuickBooks'}` : "Send To Admin")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Quote;