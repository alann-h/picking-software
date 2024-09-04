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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarcodeListener from './BarcodeListener';
import QtyModal from './QtyModal';
import ProductDetails from './ProductDetailsQuote';
import AddProductButton from './AddProductButton';
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
  const {
    quoteData,
    isLoading,
    isModalOpen,
    inputQty,
    availableQty,
    scannedProductName,
    selectedProduct,
    isAddProductModalOpen,
    handleBarcodeScanned,
    handleModalConfirm,
    handleModalClose,
    handleAddProduct,
    handleAddProductSubmit,
    handleProductDetails,
    handleCloseProductDetails,
    setIsAddProductModalOpen,
    setInputQty,
    adjustProductQtyButton,
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
    <Paper elevation={3} sx={{ padding: 3, margin: 2 }}>
      <BarcodeListener onBarcodeScanned={handleBarcodeScanned} />
      <QtyModal
        isModalOpen={isModalOpen}
        inputQty={inputQty}
        onModalClose={handleModalClose}
        onQtyChange={setInputQty}
        availableQty={availableQty}
        onModalConfirm={handleModalConfirm}
        productName={scannedProductName}
      />
      {selectedProduct && (
        <ProductDetails
          open={!!selectedProduct}
          onClose={handleCloseProductDetails}
          productName={selectedProduct.name}
          productDetails={selectedProduct.details}
        />
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
          Quote Details
        </Typography>
        <AddProductButton onClick={handleAddProduct}>
          <AddIcon />
        </AddProductButton>
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 2,
          backgroundColor: theme.palette.background.paper,
          padding: 2,
          borderRadius: 1,
        }}
      >
        <Tooltip title="Unique identifier for this quote">
          <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
            Quote #{quoteId}
          </Typography>
        </Tooltip>
        <Tooltip title="Name of the customer for this quote">
          <Typography variant="h5" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
            Customer: {quoteData.customerName}
          </Typography>
        </Tooltip>
        <Tooltip title="Total amount for all items in this quote">
          <Typography variant="h5" sx={{ color: theme.palette.secondary.main, fontWeight: 'bold' }}>
            Total Amount: ${quoteData.totalAmount}
          </Typography>
        </Tooltip>
        <Tooltip title="Time when this picking session started">
          <Typography sx={{ color: theme.palette.text.secondary }}>
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
                onAdjustQuantity={adjustProductQtyButton}
                onSaveForLater={saveForLaterButton}
                onSetUnavailable={setUnavailableButton}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AddProductModal
        open={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSubmit={handleAddProductSubmit}
      />
    </Paper>
  );
};

export default Quote;