import React from 'react';
import {
  Paper, Typography, Pagination, Box, Fade, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Grid,
  CircularProgress
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useQuote } from './useQuote';
import ProductRow from './ProductRow';
import AddProductButton from './AddProductButton';
import AddProductModal from './AddProductModal';
import BarcodeListener from './BarcodeListener';
import ProductDetails from './ProductDetails';
import QtyModal from './QtyModal';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Quote: React.FC = () => {
  const theme = useTheme();
  const query = useQuery();
  const quoteId = Number(query.get('Id') || '');
  const {
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
  } = useQuote(quoteId);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'deferred':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Fade in={true}>
      <Box sx={{ padding: 3, marginTop: 3, backgroundColor: theme.palette.background.default }}>
        <BarcodeListener onBarcodeScanned={handleBarcodeScanned} />
        <Paper elevation={3} sx={{ padding: 2, marginBottom: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="h5" component="div">
                Quote #{quoteId}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body1">
                Customer: {quoteData?.customerName}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                Total Amount: ${quoteData?.totalAmount}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <AddProductButton onClick={handleAddProduct}>
                Add Product
              </AddProductButton>
            </Grid>
          </Grid>
        </Paper>

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="quote items table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox color="primary" />
                </TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quoteData && Object.entries(quoteData.productInfo)
                .slice((currentPage - 1) * 20, currentPage * 20)
                .map(([barcode, product]) => (
                  <ProductRow
                    key={barcode}
                    product={product}
                    onProductClick={handleProductClick}
                    onAdjustQuantity={adjustProductQtyButton}
                    onSaveForLater={saveForLaterButton}
                    getStatusColor={getStatusColor}
                  />
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
          <Pagination
            count={Math.ceil(Object.keys(quoteData?.productInfo || {}).length / 20)}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>

        <AddProductModal
          open={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          onSubmit={handleAddProductSubmit}
          products={allProducts}
        />

        {selectedProduct && (
          <ProductDetails
            open={!!selectedProduct}
            onClose={handleCloseProductDetails}
            productName={selectedProduct.name}
            productDetails={selectedProduct.details}
          />
        )}

        <QtyModal
          isModalOpen={isModalOpen}
          inputQty={inputQty}
          onModalClose={handleModalClose}
          onQtyChange={setInputQty}
          availableQty={availableQty}
          onModalConfirm={handleModalConfirm}
          productName={scannedProductName}
        />
      </Box>
    </Fade>
  );
};

export default Quote;