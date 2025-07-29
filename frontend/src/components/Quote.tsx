import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Paper, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Box, useTheme, 
  Tooltip, CircularProgress, useMediaQuery, Button,
  TextField,
} 
from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarcodeListener from './BarcodeListener';
import BarcodeModal from './BarcodeModal';
import ProductDetails from './ProductDetailsQuote';
import AdjustQuantityModal from './AdjustQuantityModal';
import AddProductModal from './AddProductModal';
import ProductRow from './ProductRow';
import ProductFilter from './ProductFilter';

import CameraScannerModal from './CameraScannerModal';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

import { useSnackbarContext } from './SnackbarContext';
import { useQuoteData, useBarcodeHandling, useProductActions } from './useQuote';
import { useModalState } from '../utils/modalState';
import { ProductDetail } from '../utils/types';
import ReceiptIcon from '@mui/icons-material/Receipt';
import QuoteInvoiceModal from './QuoteInvoiceModal';
import FinalConfirmationModal from './FinalConfirmationModal';
import { Helmet } from 'react-helmet-async';
import { useUserStatus } from '../utils/useUserStatus';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Quote: React.FC = () => {
  const query = useQuery();
  const quoteId = Number(query.get('id') || '');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { modalState, closeModal, openModal } = useModalState();
  const { quoteData, isLoading, updateQuoteData} = useQuoteData(quoteId);
  const { availableQty, scannedProductName, handleBarcodeScan, handleBarcodeModal } = useBarcodeHandling(quoteId, quoteData, updateQuoteData, openModal);
  const { productDetails, adjustQuantity, openAdjustQuantityModal, saveForLater, setUnavailable, setFinished, addProduct, 
    openAddProductModal, openQuoteInvoiceModal, setQuoteChecking, savePickerNote, handleFinaliseInvoice } = useProductActions(quoteId, updateQuoteData, openModal);

  const [filteredProducts, setFilteredProducts] = useState<ProductDetail[]>([]);

  const { handleOpenSnackbar } = useSnackbarContext();
  const { isAdmin } = useUserStatus(false);

  const [pickerNote, setPickerNote] = useState(quoteData?.pickerNote || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleScannedWithSnackbar = useCallback(async (barcode: string) => {
    handleOpenSnackbar('Fetching product…', 'info');
    const normalised = barcode.length === 13 ? '0' + barcode : barcode;

    await handleBarcodeScan(normalised);
  }, [handleBarcodeScan, handleOpenSnackbar])

  const handleCameraScanSuccess = useCallback((barcode: string) => {
    closeModal();
    handleScannedWithSnackbar(barcode);
  }, [closeModal, handleScannedWithSnackbar]); 

  useEffect(() => {
    if (quoteData?.pickerNote !== undefined) {
      setPickerNote(quoteData.pickerNote);
    }
  }, [quoteData?.pickerNote]);

  const productArray = useMemo(() => {
    return quoteData ? Object.values(quoteData.productInfo) : [];
  }, [quoteData]);

    const { hasPendingProducts, backorderProducts } = useMemo(() => {
    const pending = productArray.some(p => p.pickingStatus === 'pending');
    const backorder = productArray.filter(p => p.pickingStatus === 'backorder');
    return { hasPendingProducts: pending, backorderProducts: backorder };
  }, [productArray]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (!quoteData) {
    return <Typography>No quote data available.</Typography>;
  }

  const handleFilterChange = (newFilteredProducts: ProductDetail[]) => {
    setFilteredProducts(newFilteredProducts);
  };

    const handleMainActionClick = () => {
    if (quoteData.orderStatus === 'checking') {
      if (hasPendingProducts) {
        handleOpenSnackbar('Please resolve all "pending" items before finalising the invoice.', 'error');
      } else {
        openModal('finalConfirmation');
      }
    } else {
      openQuoteInvoiceModal();
    }
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      await savePickerNote(pickerNote);
    } catch (error) {
      console.error("Failed to save picker's note:", error);
      handleOpenSnackbar("Failed to save picker's note:", 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : productArray;
  const barcodeDisabled = modalState.type === 'barcode' && modalState.isOpen;

  return (
    <Paper elevation={3} sx={{ padding: { xs: 1, sm: 2, md: 3 }, margin: { xs: 1, sm: 2 } }}>
      <Helmet>
        <title>{`Smart Picker | Quote: ${quoteId}`}</title>
      </Helmet>
       <BarcodeListener onBarcodeScanned={handleScannedWithSnackbar} disabled={barcodeDisabled} />
        {modalState.type === 'barcode' && <BarcodeModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={handleBarcodeModal} availableQty={availableQty} productName={scannedProductName} />}
        {modalState.type === 'cameraScanner' && <CameraScannerModal isOpen={modalState.isOpen} onClose={closeModal} onScanSuccess={handleCameraScanSuccess} />}
        {modalState.type === 'productDetails' && modalState.data && <ProductDetails open={modalState.isOpen} onClose={closeModal} productName={modalState.data.name} productDetails={modalState.data.details} />}
        {modalState.type === 'adjustQuantity' && modalState.data && <AdjustQuantityModal isOpen={modalState.isOpen} onClose={closeModal} productName={modalState.data.productName} currentQty={modalState.data.pickingQty} productId={modalState.data.productId} onConfirm={adjustQuantity} />}
        {modalState.type === 'addProduct' && <AddProductModal open={modalState.isOpen} onClose={closeModal} onSubmit={addProduct} />}
        {modalState.type === 'quoteInvoice' && <QuoteInvoiceModal isOpen={modalState.isOpen} onClose={closeModal} quoteData={quoteData} onProceed={setQuoteChecking} />}
        
      {modalState.type === 'finalConfirmation' && (
        <FinalConfirmationModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onConfirm={handleFinaliseInvoice}
          backorderProducts={backorderProducts}
        />
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
          Quote no.{quoteId}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: 2,
          backgroundColor: theme.palette.background.paper,
          py: 2,
          borderRadius: 1,
        }}
      >

        <Tooltip title="Name of the customer for this quote">
          <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }, mb: isMobile ? 1 : 0 }}>
            Customer: {quoteData.customerName}
          </Typography>
        </Tooltip>
        <Tooltip title="Total amount for all items in this quote">
          <Typography variant="h5" sx={{ color: theme.palette.secondary.main, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }, mb: isMobile ? 1 : 0 }}>
            Total Amount: ${quoteData.totalAmount}
          </Typography>
        </Tooltip>
        <Tooltip title="Current status of this quote">
          <Typography variant="h5" sx={{ 
            color: theme.palette.info.main, 
            fontWeight: 'bold', 
            fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }, 
            mb: isMobile ? 1 : 0,
            textTransform: 'capitalize'
          }}>
            Status: {quoteData.orderStatus}
          </Typography>
        </Tooltip>
        <Tooltip title="Time when this picking session started">
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, mb: isMobile ? 1 : 0 }}>
            Last Modified: {quoteData.lastModified}
          </Typography>
        </Tooltip>
      </Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Customer/Sales Note"
          variant="outlined"
          multiline
          rows={3}
          value={quoteData.orderNote || 'No note provided.'}
          slotProps={{input: { readOnly: true }}}
          sx={{width: '100%', '& .MuiInputBase-input': { cursor: 'default' }}}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => openModal('cameraScanner')}
            disabled={quoteData.orderStatus === 'finalised'}
          >
            <CameraAltIcon />
            {!isMobile && "Scan"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={openAddProductModal}
            disabled={quoteData.orderStatus === 'finalised'}
          >
            <AddIcon />
            {!isMobile && "Add Product"}
          </Button>
        </Box>
      </Box>

      <ProductFilter products={productArray} onFilterChange={handleFilterChange} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
              <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Picking Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayProducts.map((product) => (
              <ProductRow
                key={product.productId}
                product={product}
                onProductDetails={productDetails}
                onAdjustQuantityModal={openAdjustQuantityModal}
                onSaveForLater={saveForLater}
                onSetUnavailable={setUnavailable}
                onSetFinished = {setFinished}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
        <Box sx={{ mt: 4, borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Picker&apos;s Note
          </Typography>
          <TextField
            label="Add any notes about preparing this order..."
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={pickerNote}
            onChange={(e) => setPickerNote(e.target.value)}
            disabled={quoteData.orderStatus === 'finalised'}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="outlined"
              onClick={handleSaveNote}
              disabled={isSavingNote || pickerNote === (quoteData?.pickerNote || '') || quoteData.orderStatus === 'finalised'}
              startIcon={isSavingNote ? <CircularProgress size={20} /> : null}
            >
              {isSavingNote ? 'Saving...' : "Save Picker's Note"}
            </Button>
        </Box>
      </Box>
      {/* Final Action Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleMainActionClick}
          disabled={quoteData.orderStatus === 'finalised' || !isAdmin}
          sx={{ backgroundColor: theme.palette.warning.main, color: theme.palette.warning.contrastText, '&:hover': { backgroundColor: theme.palette.warning.dark, } }}
        >
          <ReceiptIcon sx={{ mr: 1 }} />
          {quoteData.orderStatus === 'checking' ? "Send To Quickbooks" : "Send To Admin"}
        </Button>
      </Box>
    </Paper>
  );
};

export default Quote;