import React, { useState, useEffect } from 'react';
import { Card, CardContent, Grid, Paper, Typography, Pagination, Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { QuoteData } from '../utils/types';
import { barcodeScan, barcodeToName, extractQuote, saveQuote } from '../api/quote';
import BarcodeListener from './BarcodeListener';
import QtyModal from './QtyModal';
import { useSnackbarContext } from './SnackbarContext';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const Quote: React.FC = () => {
  const query = useQuery();
  const quoteId = query.get('Id') || '';
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputQty, setInputQty] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [availableQty, setAvailableQty] = useState(0);
  const [scannedProductName, setScannedProductName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    if (quoteId) {
      extractQuote(quoteId)
        .then((response) => {
          if (response.source === 'api') {
            saveQuote(response.data);
          }
          setQuoteData(response.data);
        })
        .catch((err: Error) => {
          handleOpenSnackbar(err.message, 'error');
        });
    }
  }, [quoteId, handleOpenSnackbar]);

  const highlightStyle = {
    backgroundColor: 'yellow',
    padding: 2,
    borderRadius: 3,
  };

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    barcodeToName(barcode)
      .then(({ productName }) => {
        const product = quoteData?.productInfo[productName];

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

  return (
    <Paper elevation={8} sx={{ padding: 3, marginTop: 3 }}>
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
          <Grid container spacing={1}>
            {Object.entries(quoteData.productInfo || {})
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map(([name, details], index) => (
                <Grid item xs={12} key={index}>
                  <Card variant="outlined">
                    <CardContent sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      '&.MuiCardContent-root': { padding: 2 },
                      ...(details.SKU.toLowerCase().includes('but') ? highlightStyle : {})
                    }}>
                      <Typography variant="body2">{details.SKU}</Typography>
                      <Typography variant="body2">{name}</Typography>
                      <Typography variant="body2">{details.pickingQty}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
          <Typography sx={{ textAlign: 'center', margin: 2 }}>
            <span style={{ ...highlightStyle, fontWeight: 'bold' }}>Total Amount: {quoteData.totalAmount}</span>
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
            <Pagination
              count={Math.ceil(Object.keys(quoteData?.productInfo || {}).length / itemsPerPage)}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
            />
          </Box>
        </>
      ) : (
        <Typography variant="body2">No data to display</Typography>
      )}
    </Paper>
  );
};

export default Quote;
