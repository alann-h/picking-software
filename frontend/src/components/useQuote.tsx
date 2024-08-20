import { useState, useEffect, useCallback } from 'react';
import { QuoteData, ProductDetail, ProductDetailsDB, Product } from '../utils/types';
import { extractQuote, saveQuote, barcodeToName, barcodeScan, addProductToQuote, adjustProductQty } from '../api/quote';
import { getProductInfo, getAllProducts, saveProductForLater } from '../api/others';
import { useSnackbarContext } from '../components/SnackbarContext';

export const useQuote = (quoteId: number) => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inputQty, setInputQty] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [availableQty, setAvailableQty] = useState(0);
  const [scannedProductName, setScannedProductName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<{ name: string; details: ProductDetailsDB } | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const { handleOpenSnackbar } = useSnackbarContext();
  const refetchQuote = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const fetchQuote = async () => {
      setIsLoading(true);
      try {
        const response = await extractQuote(quoteId);
        if (response.source === 'api') {
          await saveQuote(response.data);
        }
        setQuoteData(response.data);
      } catch (err) {
        handleOpenSnackbar(err instanceof Error ? err.message : 'An unknown error occurred', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuote();
  }, [quoteId, refetchTrigger, handleOpenSnackbar]);

  useEffect(() => {
    getAllProducts()
      .then(products => setAllProducts(products))
      .catch((err: Error) => {
        handleOpenSnackbar(err.message, 'error');
      });
  }, [handleOpenSnackbar]);

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
            setIsModalOpen(true);
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

  const handleModalConfirm = () => {
    barcodeScan(scannedBarcode, quoteId, inputQty)
      .then((data) => {
        handleOpenSnackbar('Barcode scanned successfully!', 'success');
        updateProductQuantity(data.productName, data.updatedQty);
        setIsModalOpen(false);
        setInputQty(1);
      })
      .catch((error) => {
        handleOpenSnackbar(`Error scanning barcode: ${error.message}`, 'error');
      });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    handleOpenSnackbar('Modal Closed!', 'error');
    setInputQty(1);
  };

  const updateProductQuantity = (productName: string, updatedQty: number) => {
    if (!quoteData) return;
    const newProductInfo = { ...quoteData.productInfo || {} };
    if (newProductInfo[productName]) {
      newProductInfo[productName]!.pickingQty = updatedQty;
      setQuoteData({ ...quoteData, productInfo: newProductInfo });
    }
  };

  const handleAddProduct = async () => {
    setIsAddProductModalOpen(true);
  };

  const handleAddProductSubmit = async (productName: string, qty: number) => {
    try {
      await addProductToQuote(productName, quoteId, qty);
      handleOpenSnackbar('Product added successfully!', 'success');
      setIsAddProductModalOpen(false);
      setRefetchTrigger(prev => prev + 1);
    } catch (error) {
      if (error instanceof Error) {
        handleOpenSnackbar(`Error adding product: ${error.message}`, 'error');
      } else {
        handleOpenSnackbar('An unknown error occurred', 'error');
      }
    }
  };

  const handleProductClick = async (productId: number, details: ProductDetail) => {
    try {
      const data = await getProductInfo(productId);
      setSelectedProduct({
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

  const handleCloseProductDetails = () => {
    setSelectedProduct(null);
  };

  const adjustProductQtyButton = async (productId: number, newQty: number) => {
    try {
      await adjustProductQty(quoteId, productId, newQty);
      handleOpenSnackbar('Product adjusted successfully!', 'success');
      refetchQuote();
    } catch (error) {
      handleOpenSnackbar(`Error adjusting product quantity ${error}`, 'error');
    }
  };

  const saveForLaterButton = async (productId: number) => {
    try {
      const response = await saveProductForLater(quoteId, productId);
      handleOpenSnackbar(response.message, 'success');
      refetchQuote();
      return response;
    } catch (error) {
      handleOpenSnackbar(`${error}`, 'error');
    }
  }
  return {
    quoteData,
    isLoading,
    isModalOpen,
    inputQty,
    availableQty,
    scannedProductName,
    currentPage,
    selectedProduct,
    isAddProductModalOpen,
    allProducts,
    handleBarcodeScanned,
    handleModalConfirm,
    handleModalClose,
    handleAddProduct,
    handleAddProductSubmit,
    handleProductClick,
    handleCloseProductDetails,
    setCurrentPage,
    setIsAddProductModalOpen,
    setInputQty,
    adjustProductQtyButton,
    saveForLaterButton,
  };
};