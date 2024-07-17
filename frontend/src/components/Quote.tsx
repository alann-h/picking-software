import React from 'react';
import { Paper, Typography, Pagination, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLocation } from 'react-router-dom';
import BarcodeListener from './BarcodeListener';
import QtyModal from './QtyModal';
import ProductDetails from './ProductDetails';
import AddProductButton from './AddProductButton';
import AddProductModal from './AddProductModal';
import ProductCard from './ProductCard';
import { useQuote } from './useQuote';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Quote: React.FC = () => {
  const query = useQuery();
  const quoteId = query.get('Id') || '';
  const {
    quoteData,
    isModalOpen,
    inputQty,
    availableQty,
    scannedProductName,
    currentPage,
    selectedProduct,
    isAddProductModalOpen,
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
  } = useQuote(quoteId);

  const highlightStyle = {
    backgroundColor: 'yellow',
    padding: 2,
    borderRadius: 3,
  };

  return (
    <Paper elevation={8} sx={{ padding: 3, marginTop: 3, position: 'relative' }}>
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
      <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
        <AddProductButton
          onClick={handleAddProduct}
          sx={{
            minWidth: 0,
            width: 40,
            height: 40,
            borderRadius: '50%',
            padding: 0,
          }}
        >
          <AddIcon />
        </AddProductButton>
      </Box>
      {quoteData ? (
        <>
          <Paper variant="outlined" sx={{ padding: 2, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1" sx={{ margin: 0, fontWeight: 'bold' }}>
              Customer: {quoteData.customer}
            </Typography>
            <Typography variant="body1" sx={{ margin: 0, fontWeight: 'bold' }}>
              Quote Number: {quoteId}
            </Typography>
          </Paper>
          {Object.entries(quoteData.productInfo || {})
            .slice((currentPage - 1) * 20, currentPage * 20)
            .map(([name, details], index) => (
              <ProductCard
                key={index}
                name={name}
                details={details}
                onClick={() => handleProductClick(name, details)}
              />
            ))}
          <Typography sx={{ textAlign: 'center', margin: 2 }}>
            <span style={{ ...highlightStyle, fontWeight: 'bold' }}>Total Amount: ${quoteData.totalAmount}</span>
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
            <Pagination
              count={Math.ceil(Object.keys(quoteData?.productInfo || {}).length / 20)}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
            />
          </Box>
        </>
      ) : (
        <Typography variant="body2">No data to display</Typography>
      )}
      <AddProductModal
        open={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSubmit={handleAddProductSubmit}
      />
    </Paper>
  );
};

export default Quote;