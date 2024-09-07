import { useState, useEffect, useCallback, useRef } from 'react';
import { QuoteData, ProductDetail } from '../utils/types';
import { extractQuote, saveQuote, barcodeToName, barcodeScan, addProductToQuote, adjustProductQty } from '../api/quote';
import { getProductInfo, saveProductForLater, setProductUnavailable } from '../api/others';
import { useSnackbarContext } from '../components/SnackbarContext';
import { useModalState } from '../utils/modalState';

export const useQuote = (quoteId: number) => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { modalState, openModal, closeModal } = useModalState();
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [availableQty, setAvailableQty] = useState(0);
  const [scannedProductName, setScannedProductName] = useState('');

  const { handleOpenSnackbar } = useSnackbarContext();
  const isSavingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveQuoteWithDelay = useCallback(async (data: QuoteData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        await saveQuote(data);
        handleOpenSnackbar('Quote saved successfully', 'success');
      } catch (err) {
        handleOpenSnackbar(`Error saving quote: ${(err as Error).message}`, 'error');
      } finally {
        isSavingRef.current = false;
      }
    }, 1000);  // 1 second delay
  }, [handleOpenSnackbar]);

  const fetchQuoteData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await extractQuote(quoteId);
      setQuoteData(response.data);
      if (response.source === 'api') {
        saveQuoteWithDelay(response.data);
      }
    } catch (err) {
      handleOpenSnackbar((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [quoteId, saveQuoteWithDelay, handleOpenSnackbar]);

  useEffect(() => {
    fetchQuoteData();
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
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


  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    barcodeToName(barcode)
      .then(({ productName }) => {
        const product = quoteData?.productInfo[barcode];
        if (product) {
          if (product.pickingQty === 0) {
            handleOpenSnackbar('Product quantity is already 0!', 'error');
          } else {
            setAvailableQty(product.pickingQty);
            openModal('barcode', { productName });
            setScannedProductName(productName);
          }
        } else {
          handleOpenSnackbar('Product not found in quote data', 'error');
        }
      })
      .catch((error) => {
        handleOpenSnackbar(error.message, 'error');
      });
  };
  
  const handleModalConfirm = (inputQty: number) => {
    barcodeScan(scannedBarcode, quoteId, inputQty)
      .then((data) => {
        handleOpenSnackbar('Barcode scanned successfully!', 'success');
        updateQuoteData(prevQuoteData => {
          const updatedProductInfo = { ...prevQuoteData.productInfo };
          const scannedProduct = Object.values(updatedProductInfo).find(
            product => product.productName === data.productName
          );
          if (scannedProduct) {
            scannedProduct.pickingQty = data.updatedQty;
            scannedProduct.pickingStatus = data.pickingStatus;
          }
          return updatedProductInfo;
        });
      })
      .catch((error) => {
        handleOpenSnackbar(`Error scanning barcode: ${error.message}`, 'error');
      });
  };

  const handleAddProduct = () => {
    openModal('addProduct');
  };

  const handleAddProductSubmit = useCallback(async (productName: string, qty: number) => {
    if (!quoteData) return;

    try {
      const response = await addProductToQuote(productName, quoteId, qty);
      if (response.status === 'new') {
        const newProduct: ProductDetail = {
          productId: response.productInfo.productid,
          productName: response.productInfo.productname,
          sku: response.productInfo.sku,
          pickingQty: response.productInfo.pickingqty,
          originalQty: response.productInfo.originalqty,
          pickingStatus: response.productInfo.pickingstatus,
          barcode: response.productInfo.barcode,
        };

        updateQuoteData(prevQuoteData => ({
          ...prevQuoteData,
          productInfo: {
            ...prevQuoteData.productInfo,
            [newProduct.barcode]: newProduct
          },
          totalAmount: response.totalAmt
        }));
      } else if (response.status === 'exists') {
        updateQuoteData(prevQuoteData => {
          const updatedProductInfo = { ...prevQuoteData.productInfo };
          const existingProduct = Object.values(updatedProductInfo).find(
            product => product.productName === productName
          );
          if (existingProduct) {
            existingProduct.pickingQty = response.pickingQty;
            existingProduct.originalQty = response.originalQty;
          }
          return { productInfo: updatedProductInfo, totalAmount: response.totalAmt };
        });
      }
      closeModal();
      handleOpenSnackbar('Product added successfully', 'success');
    } catch (error) {
      handleOpenSnackbar(`Error adding product: ${error}`, 'error');
    }
  }, [quoteId, quoteData, updateQuoteData, handleOpenSnackbar]);

  const handleProductDetails = async (productId: number, details: ProductDetail) => {
    try {
      const data = await getProductInfo(productId);
      openModal('productDetails', {
        name: data.productname,
        details: {
          sku: data.sku,
          pickingQty: details.pickingQty,
          originalQty: details.originalQty,
          qtyOnHand: data.quantity_on_hand,
          pickingStatus: details.pickingStatus,
          productId: data.productid
        }
      });
    } catch (error) {
      handleOpenSnackbar('Error fetching product details', 'error');
    }
  };

  const openAdjustQuantityModal = (productId: number, currentQty: number, productName: string) => {
    openModal('adjustQuantity', { productId, currentQty, productName });
  };
  
  const handleAdjustQuantity = async (productId: number, newQty: number) => {
    try {
      const data = await adjustProductQty(quoteId, productId, newQty);
      handleOpenSnackbar('Product adjusted successfully!', 'success');
      updateQuoteData(prevQuoteData => {
        const updatedProductInfo = { ...prevQuoteData.productInfo };
        const product = Object.values(updatedProductInfo).find(
          product => product.productId === productId
        );
        if (product) {
          product.pickingQty = data.pickingQty;
          product.originalQty = data.originalQty;
        }
        return {
          productInfo: updatedProductInfo,
          totalAmount: data.totalAmount
        };
      });
      closeModal();
    } catch (error) {
      handleOpenSnackbar(`Error adjusting product quantity: ${error}`, 'error');
    }
  };

  const saveForLaterButton = async (productId: number) => {
    try {
      const data = await saveProductForLater(quoteId, productId);
      handleOpenSnackbar(data.message, 'success');
      updateQuoteData(prevQuoteData => {
        const updatedProductInfo = { ...prevQuoteData.productInfo };
        const product = Object.values(updatedProductInfo).find(
          product => product.productId === productId
        );
        if (product) {
          product.pickingStatus = data.newStatus;
        }
        return updatedProductInfo;
      });
      return data.newStatus;
    } catch (error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  };

  const setUnavailableButton = async (productId: number) => {
    try {
      const data = await setProductUnavailable(quoteId, productId);
      handleOpenSnackbar(data.message, 'success');
      updateQuoteData(prevQuoteData => {
        const updatedProductInfo = { ...prevQuoteData.productInfo };
        const product = Object.values(updatedProductInfo).find(
          product => product.productId === productId
        );
        if (product) {
          product.pickingStatus = data.newStatus;
        }
        return updatedProductInfo;
      });
      return data.newStatus;
    } catch (error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  };
  return {
    quoteData,
    isLoading,
    modalState,
    availableQty,
    scannedProductName,
    closeModal,
    openModal,
    handleBarcodeScanned,
    handleModalConfirm,
    handleAddProduct,
    handleAddProductSubmit,
    handleProductDetails,
    handleAdjustQuantity,
    openAdjustQuantityModal,
    saveForLaterButton,
    setUnavailableButton,
  };
};