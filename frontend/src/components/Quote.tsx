import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  useTheme,
  Tooltip,
  CircularProgress,
  useMediaQuery,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarcodeListener from './BarcodeListener';
import QtyModal from './BarcodeModal';
import ProductDetails from './ProductDetailsQuote';
import AdjustQuantityModal from './AdjustQuantityModal';
import AddProductModal from './AddProductModal';
import ProductRow from './ProductRow';
import ProductFilter from './ProductFilter';
import { useQuote } from './useQuote';
import { ProductDetail } from '../utils/types';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Quote: React.FC = () => {
  const query = useQuery();
  const quoteId = Number(query.get('Id') || '');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    quoteData,
    isLoading,
    modalState,
    availableQty,
    scannedProductName,
    closeModal,
    handleBarcodeScanned,
    handleModalConfirm,
    handleAddProduct,
    handleAddProductSubmit,
    handleProductDetails,
    handleAdjustQuantity,
    openAdjustQuantityModal,
    saveForLaterButton,
    setUnavailableButton,
  } = useQuote(quoteId);

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
      <BarcodeListener onBarcodeScanned={handleBarcodeScanned} />
      {modalState.type === 'barcode' && (
        <QtyModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onConfirm={handleModalConfirm}
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
            onConfirm={handleAdjustQuantity}
          />
        )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, flexDirection: isMobile ? 'column' : 'row' }}>
        <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' } }}>
          Quote Details
        </Typography>
        <Button variant="contained" color="primary" onClick={handleAddProduct}>
          <AddIcon />
        </Button>
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
                onProductDetails={handleProductDetails}
                onAdjustQuantity={openAdjustQuantityModal}
                onSaveForLater={saveForLaterButton}
                onSetUnavailable={setUnavailableButton}
                isMobile={isMobile}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {modalState.type === 'addProduct' && (
        <AddProductModal
          open={modalState.isOpen}
          onClose={closeModal}
          onSubmit={handleAddProductSubmit}
        />
      )}
    </Paper>
  );
};

export default Quote;