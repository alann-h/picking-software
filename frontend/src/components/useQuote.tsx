import { useState, useCallback, useRef, useEffect } from 'react';
import { QuoteData, ProductDetail, QuoteUpdateFunction } from '../utils/types';
import { OpenModalFunction } from '../utils/modalState';
import { handleBarcodeScanned, handleModalConfirm } from '../utils/barcodeHandlers';
import { handleProductDetails, handleAdjustQuantity, saveForLaterButton, setUnavailableButton, handleAddProduct } from '../utils/productHandlers';
import { createSaveQuoteWithDelay, createFetchQuoteData } from '../utils/quoteDataHandlers';
import { useSnackbarContext } from './SnackbarContext';


export const useQuoteData = (quoteId: number) => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { handleOpenSnackbar } = useSnackbarContext();

  const quoteDataRef = useRef<QuoteData | null>(null);
  useEffect(() => {
    quoteDataRef.current = quoteData;
  }, [quoteData]);

  const saveQuoteWithDelay = useCallback(async () => {
    try {
      await createSaveQuoteWithDelay(saveTimeoutRef, isSavingRef, quoteDataRef.current);
      handleOpenSnackbar('Quote saved successfully', 'success');
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar]);

  const fetchQuoteData = useCallback(async () => {
    try {
      const response = await createFetchQuoteData(quoteId, setIsLoading);
      setQuoteData(response.data);
      if (response.source === 'api') {
        saveQuoteWithDelay();
      }
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [quoteId, saveQuoteWithDelay, handleOpenSnackbar]);

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
    updater: (prevQuoteData: QuoteData) => Partial<QuoteData>
  ) => {
    setQuoteData(prevQuoteData => {
      if (!prevQuoteData) return null;
      const updates = updater(prevQuoteData);
      return {
        ...prevQuoteData,
        ...updates,
        productInfo: updates.productInfo || prevQuoteData.productInfo
      };
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

  const productDetails = useCallback(async (productId: number, details: ProductDetail) => {
    try { 
      const data = await handleProductDetails(productId, details);
      openModal('productDetails', data);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar, openModal]);

  const openAdjustQuantityModal = useCallback(async (productId: number, newQty: number, productName: string) => {
    try {
      openModal('adjustQuantity', { productId, newQty, productName });
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
  
  const openAddProductModal = () => {
    try {
      openModal('addProduct', null);
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  };

  const addProduct = useCallback(async (productName: string, qty: number) => {
    try {
      const data = await handleAddProduct(productName, quoteId, qty, updateQuoteData);
      handleOpenSnackbar(`${productName} Product added successfully!`, 'success');
      return data;
    } catch(error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }, [handleOpenSnackbar, quoteId, updateQuoteData])

  return { productDetails, adjustQuantity, openAdjustQuantityModal, saveForLater, setUnavailable, addProduct, openAddProductModal };
};
