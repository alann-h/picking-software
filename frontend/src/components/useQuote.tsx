import { useState, useCallback, useRef, useEffect } from 'react';
import { QuoteData, ProductDetail, QuoteUpdateFunction } from '../utils/types';
import { useModalState } from '../utils/modalState';
import { handleBarcodeScanned, handleModalConfirm } from '../utils/barcodeHandlers';
import { handleProductDetails, handleAdjustQuantity, saveForLaterButton, setUnavailableButton, handleAddProduct } from '../utils/productHandlers';
import { createSaveQuoteWithDelay, createFetchQuoteData, createUpdateQuoteData } from '../utils/quoteDataHandlers';
import { useSnackbarContext } from './SnackbarContext';

export const useQuoteData = (quoteId: number) => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { handleOpenSnackbar } = useSnackbarContext();

  const saveQuoteWithDelay = useCallback(async () => {
    try {
      await createSaveQuoteWithDelay(saveTimeoutRef, isSavingRef, quoteData);
      handleOpenSnackbar('Quote saved successfully', 'success');
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar, quoteData]);
 
 
  const fetchQuoteData = useCallback(async () => {
    try {
      const response = await createFetchQuoteData(quoteId, setQuoteData, setIsLoading);
      if (response.source === 'api') {
        saveQuoteWithDelay();
      }
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [quoteId, saveQuoteWithDelay, handleOpenSnackbar]);
 
  const updateQuoteData = useCallback(async () => {
    try {
      await createUpdateQuoteData(setQuoteData);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar]);

  useEffect(() => {
    fetchQuoteData();
    const currentSaveTimeout = saveTimeoutRef.current;
    return () => {
      if (currentSaveTimeout) {
        clearTimeout(currentSaveTimeout);
      }
    };
  }, []);

  return {
    quoteData,
    isLoading,
    updateQuoteData,
  };
};

export const useBarcodeHandling = (quoteId: number, quoteData: QuoteData | null, updateQuoteData: QuoteUpdateFunction) => {
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [availableQty, setAvailableQty] = useState(0);
  const [scannedProductName, setScannedProductName] = useState('');
  const { openModal } = useModalState();
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

export const useProductActions = (quoteId: number, updateQuoteData: QuoteUpdateFunction) => {
  const { openModal } = useModalState();
  const { handleOpenSnackbar } = useSnackbarContext();

  const productDetails = useCallback(async (productId: number, details: ProductDetail) => {
    try { 
      await handleProductDetails(productId, details);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar]);

  const adjustQuantity = useCallback(async (productId: number, newQty: number) => {
    try {
      const data = await handleAdjustQuantity(quoteId, productId, newQty, updateQuoteData, openModal)
      handleOpenSnackbar('Product quantity adjusted successfully!', 'success');
      return data;
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
    
  },[quoteId, updateQuoteData, handleOpenSnackbar, openModal]);

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
  
  const addProduct = useCallback(async (productName: string, qty: number) => {
    try {
      const data = await handleAddProduct(productName, quoteId, qty, updateQuoteData, openModal);
      handleOpenSnackbar(`${productName} Product added successfully!`, 'success');
      return data;
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar, openModal, quoteId, updateQuoteData])

  return { productDetails, adjustQuantity, saveForLater, setUnavailable, addProduct };
};
