import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Paper, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Box, useTheme, 
  Tooltip, CircularProgress, useMediaQuery, Button,
} 
from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarcodeListener from './BarcodeListener';
import QtyModal from './BarcodeModal';
import ProductDetails from './ProductDetailsQuote';
import AdjustQuantityModal from './AdjustQuantityModal';
import AddProductModal from './AddProductModal';
import ProductRow from './ProductRow';
import ProductFilter from './ProductFilter';
import { useQuoteData, useBarcodeHandling, useProductActions } from './useQuote';
import { useModalState } from '../utils/modalState';
import { ProductDetail } from '../utils/types';
import ReceiptIcon from '@mui/icons-material/Receipt';
import QuoteInvoiceModal from './QuoteInvoiceModal';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Quote: React.FC = () => {
  const query = useQuery();
  const quoteId = Number(query.get('Id') || '');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { modalState, closeModal, openModal } = useModalState();
  const { quoteData, isLoading, updateQuoteData} = useQuoteData(quoteId);
  const { availableQty, scannedProductName, handleBarcodeScan, handleBarcodeModal } = useBarcodeHandling(quoteId, quoteData, updateQuoteData, openModal);
  const { productDetails, adjustQuantity, openAdjustQuantityModal, saveForLater, setUnavailable, addProduct, 
    openAddProductModal, openQuoteInvoiceModal, setQuoteChecking, handleFinalizeInvoice } = useProductActions(quoteId, updateQuoteData, openModal);

  const [filteredProducts, setFilteredProducts] = useState<ProductDetail[]>([]);

  const productArray = useMemo(() => {
    return quoteData ? Object.values(quoteData.productInfo) : [];
  }, [quoteData]);

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

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : productArray;

  return (
    <Paper elevation={3} sx={{ padding: { xs: 1, sm: 2, md: 3 }, margin: { xs: 1, sm: 2 } }}>
      <BarcodeListener onBarcodeScanned={handleBarcodeScan} />
      {modalState.type === 'barcode' && (
        <QtyModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onConfirm={handleBarcodeModal}
          availableQty={availableQty}
          productName={scannedProductName}
        />
      )}
        {modalState.type === 'productDetails' && modalState.data && (
          <ProductDetails
            open={modalState.isOpen}
            onClose={closeModal}
            productName={modalState.data.name}
            productDetails={modalState.data.details}
          />
        )}
          {modalState.type === 'adjustQuantity' && modalState.data && (
          <AdjustQuantityModal
            isOpen={modalState.isOpen}
            onClose={closeModal}
            productName={modalState.data.productName}
            currentQty={modalState.data.pickingQty}
            productId={modalState.data.productId}
            onConfirm={adjustQuantity}
          />
        )}
        {modalState.type === 'addProduct' && (
        <AddProductModal
          open={modalState.isOpen}
          onClose={closeModal}
          onSubmit={addProduct}
        />
      )}
      {modalState.type === 'quoteInvoice' && (
        <QuoteInvoiceModal
            isOpen={modalState.isOpen}
            onClose={closeModal}
            quoteData={quoteData}
            onProceed={setQuoteChecking}
        />
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, flexDirection: isMobile ? 'column' : 'row' }}>
        <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
          Quote Details
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: isMobile ? 2 : 0 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={openAddProductModal}
              disabled={quoteData.orderStatus === 'finalised'}
            >
              <AddIcon />
              {!isMobile && "Add Product"}
            </Button>
            <Button 
              variant="contained"
              onClick={quoteData.orderStatus === 'checking' ? handleFinalizeInvoice : openQuoteInvoiceModal}
              disabled={quoteData.orderStatus === 'finalised'}
              sx={{
                backgroundColor: theme.palette.warning.main,
                color: theme.palette.warning.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.warning.dark,
                }
              }}
            >
              <ReceiptIcon />
              {!isMobile && (quoteData.orderStatus === 'checking' ? "Finalise Invoice" : "Convert to Invoice")}
            </Button>
        </Box>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: 2,
          backgroundColor: theme.palette.background.paper,
          padding: 2,
          borderRadius: 1,
        }}
      >
        <Tooltip title="Unique identifier for this quote">
          <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }, mb: isMobile ? 1 : 0 }}>
            Quote #{quoteId}
          </Typography>
        </Tooltip>
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
          <Typography sx={{ color: theme.palette.text.secondary, fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}>
            Started: {quoteData.timeStarted}
          </Typography>
        </Tooltip>
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
                key={`${product.barcode}-${product.productId}`}
                product={product}
                onProductDetails={productDetails}
                onAdjustQuantityModal={openAdjustQuantityModal}
                onSaveForLater={saveForLater}
                onSetUnavailable={setUnavailable}
                isMobile={isMobile}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default Quote;