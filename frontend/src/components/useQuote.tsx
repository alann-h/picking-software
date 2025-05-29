import { useState, useCallback, useRef, useEffect } from 'react';
import { QuoteData, ProductDetail, QuoteUpdateFunction } from '../utils/types';
import { OpenModalFunction } from '../utils/modalState';
import { handleBarcodeScanned, handleModalConfirm } from '../utils/barcodeHandlers';
import { handleProductDetails, handleAdjustQuantity, saveForLaterButton, setUnavailableButton, setFinishedButton ,handleAddProduct } from '../utils/productHandlers';
import { createFetchQuoteData } from '../utils/quoteDataHandlers';
import { useSnackbarContext } from './SnackbarContext';
import { updateQuoteInQuickBooks, updateQuoteStatus } from '../api/quote';
import { useNavigate } from 'react-router-dom';


export const useQuoteData = (quoteId: number) => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { handleOpenSnackbar } = useSnackbarContext();

  const quoteDataRef = useRef<QuoteData | null>(null);
  useEffect(() => {
    quoteDataRef.current = quoteData;
  }, [quoteData]);

  const fetchQuoteData = useCallback(async () => {
    try {
      const response = await createFetchQuoteData(quoteId, setIsLoading);
      setQuoteData(response.data);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [quoteId, handleOpenSnackbar]);

  useEffect(() => {
    fetchQuoteData();
    const currentSaveTimeout = saveTimeoutRef.current;
    return () => {
      if (currentSaveTimeout) {
        clearTimeout(currentSaveTimeout);
      }
    };
  }, [fetchQuoteData]);

  const updateQuoteData = useCallback((
    updater: (prev: QuoteData) => Partial<QuoteData>
  ) => {
    setQuoteData(prev => {
      if (!prev) return null;
      const updates = updater(prev);
      return { ...prev, ...updates };
    });
  }, []);

  return {
    quoteData,
    isLoading,
    updateQuoteData,
    refetchQuote: fetchQuoteData // if i want to refetch the whole quote page for whatever reason (currently unused)
  };
};

export const useBarcodeHandling = (quoteId: number, quoteData: QuoteData | null, updateQuoteData: QuoteUpdateFunction, openModal: OpenModalFunction) => {
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [availableQty, setAvailableQty] = useState(0);
  const [scannedProductName, setScannedProductName] = useState('');
  const { handleOpenSnackbar } = useSnackbarContext();

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      await handleBarcodeScanned(
        barcode,
        quoteData,
        setScannedBarcode,
        setAvailableQty,
        setScannedProductName,
        openModal
      );
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }

  }, [quoteData, openModal, handleOpenSnackbar]);

  const handleBarcodeModal = useCallback(async (inputQty: number) => {
    try {
      const productInfo = await handleModalConfirm(
        scannedBarcode,
        quoteId,
        inputQty,
        updateQuoteData,
      );
      handleOpenSnackbar('Barcode scanned successfully!', 'success');
      return productInfo
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }

  }, [scannedBarcode, quoteId, updateQuoteData, handleOpenSnackbar]);

  return { availableQty, scannedProductName, handleBarcodeScan, handleBarcodeModal };
};

export const useProductActions = (quoteId: number, updateQuoteData: QuoteUpdateFunction, openModal: OpenModalFunction) => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const navigate = useNavigate();

  const productDetails = useCallback(async (productId: number, details: ProductDetail) => {
    try { 
      const data = await handleProductDetails(productId, details);
      openModal('productDetails', data);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar, openModal]);

  const openAdjustQuantityModal = useCallback(async (productId: number, pickingQty: number, productName: string) => {
    try {
      openModal('adjustQuantity', { productId, pickingQty, productName });
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [openModal, handleOpenSnackbar]);

  const adjustQuantity = useCallback(async (productId: number, newQty: number) => {
    try {
      const data = await handleAdjustQuantity(quoteId, productId, newQty, updateQuoteData)
      handleOpenSnackbar('Product quantity adjusted successfully!', 'success');
      return data;
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
      throw error;
    }
    
  },[quoteId, updateQuoteData, handleOpenSnackbar]);

  const saveForLater = useCallback(async (productId: number) => {
    try {
      const data = await saveForLaterButton(quoteId, productId, updateQuoteData);
      handleOpenSnackbar(data.message, 'success');
      return data.newStatus;
    } catch (error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [quoteId, updateQuoteData, handleOpenSnackbar]);

  const setUnavailable = useCallback(async (productId: number) => {
      try {
        const data = await setUnavailableButton(quoteId, productId, updateQuoteData)
        handleOpenSnackbar(data.message, 'success');
        return data.newStatus;
      } catch(error) {
        handleOpenSnackbar(`${error}`, 'error');
      }
    
    },[quoteId, updateQuoteData, handleOpenSnackbar]);

    const setFinished = useCallback(async (productId: number) => {
      try {
        const data = await setFinishedButton(quoteId, productId, updateQuoteData)
        handleOpenSnackbar(data.message, 'success');
        return data;
      } catch(error) {
        handleOpenSnackbar(`${error}`, 'error');
      }
    
    },[quoteId, updateQuoteData, handleOpenSnackbar]);
  
  
  const openAddProductModal = () => {
    try {
      openModal('addProduct', null);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  };

  const addProduct = useCallback(async (productId: number, qty: number) => {
    try {
      const data = await handleAddProduct(productId, quoteId, qty, updateQuoteData);
      handleOpenSnackbar(`Product added successfully!`, 'success');
      return data;
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
      throw error
    }
  }, [handleOpenSnackbar, quoteId, updateQuoteData]);

  const openQuoteInvoiceModal = useCallback(() => {
    try {
      openModal('quoteInvoice', null);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [openModal, handleOpenSnackbar]);

  const setQuoteChecking = useCallback(async (newStatus: string) => {
    try {
      await updateQuoteStatus(quoteId, newStatus);
      handleOpenSnackbar(`${quoteId} Quote Id set to checking status!`, 'success');
      return;
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar, quoteId]);

  const handleFinalizeInvoice = async () => {
    try {
      await updateQuoteInQuickBooks(quoteId);
      // Open QuickBooks in the first tab (ensures login)
      const qbWindow = window.open('https://qbo.intuit.com/', '_blank');

      setTimeout(() => {
        // After 3 seconds, navigate to the specific estimate
        if (qbWindow) {
          qbWindow.location.href = `https://qbo.intuit.com/app/estimate?txnId=${quoteId}`;
        }
      }, 3000);
      
      handleOpenSnackbar('Quote updated and opened in QuickBooks', 'success');
      navigate('/dashboard');
    } catch (error) {
      handleOpenSnackbar('Failed to finalise invoice', 'error');
    }
  };

  return { productDetails, adjustQuantity, openAdjustQuantityModal, saveForLater, setUnavailable, setFinished, addProduct, 
    openAddProductModal, openQuoteInvoiceModal, setQuoteChecking, handleFinalizeInvoice };
};
