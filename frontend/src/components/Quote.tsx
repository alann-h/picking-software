import React, { useState, useEffect } from 'react';
import { Card, CardContent, Grid, Paper, Typography } from '@mui/material';
import { QuoteData } from '../utils/types';
import { barcodeScan, barcodeToName } from '../api/quote';
import BarcodeListener from './BarcodeListener';
import { QuoteProps } from '../utils/types';
import QtyModal from './QtyModal';
import { useSnackbarContext } from './SnackbarContext';
// test
const Quote: React.FC<QuoteProps> = ({ quoteData, quoteNumber, currentPage, itemsPerPage }) => {
  const [updatedQuoteData, setUpdatedQuoteData] = useState<QuoteData | null>(quoteData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputQty, setInputQty] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [availableQty, setAvailableQty] = useState(0);
  const [scannedProductName, setscannedProductName] = useState("");

  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    setUpdatedQuoteData(quoteData);
  }, [quoteData]);

  const highlightStyle = {
    backgroundColor: 'yellow',
    padding: 2,
    borderRadius: 3,
  };

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    barcodeToName(barcode)
      .then(({ productName }) => {
        const product = updatedQuoteData?.productInfo[productName];
  
        if (product) {
          setAvailableQty(product.Qty);
          setIsModalOpen(true);
          setscannedProductName(productName);
        } else {
          handleOpenSnackbar('Product not found in quote data', 'error');
        }
      })
      .catch(error => {
        handleOpenSnackbar(error.message, 'error');
      });
  };
  
  const handleModalConfirm = () => {
    barcodeScan(scannedBarcode, quoteNumber, inputQty)
      .then(data => {
        handleOpenSnackbar('Barcode scanned successfully!', 'success');
        updateProductQuantity(data.productName, data.updatedQty);
        setIsModalOpen(false);
        setInputQty(1);
      })
      .catch(error => {
        handleOpenSnackbar(`Error scanning barcode: ${error.message}`, 'error');
      });
  };
  
  const handleModalClose = () => {
    setIsModalOpen(false);
    handleOpenSnackbar('Modal Closed!', 'error');
    setInputQty(1); 
  };

  const updateProductQuantity = (productName: string, updatedQty: number) => {
    if (!updatedQuoteData) return;
    const newProductInfo = { ...updatedQuoteData.productInfo || {} };
    if (newProductInfo[productName]) {
      newProductInfo[productName]!.Qty = updatedQty;
      setUpdatedQuoteData({ ...updatedQuoteData, productInfo: newProductInfo });
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
      {updatedQuoteData ? (
        <>
          <Paper variant="outlined" sx={{ padding: 2, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1" sx={{ margin: 0, fontWeight: 'bold' }}>
              Customer: {updatedQuoteData.customer}
            </Typography>
            <Typography variant="body1" sx={{ margin: 0, fontWeight: 'bold' }}>
              Quote Number: {quoteNumber}
            </Typography>
          </Paper>
          <Grid container spacing={1}>
            {Object.entries(updatedQuoteData.productInfo || {})
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
                      <Typography variant="body2">{details.Qty}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
          <Typography sx={{ textAlign: 'center', margin: 2 }}>
            <span style={{ ...highlightStyle, fontWeight: 'bold' }}>Total Amount: {updatedQuoteData.totalAmount}</span>
          </Typography>
        </>
      ) : (
        <Typography variant="body2">No data to display</Typography>
      )}
    </Paper>
  );
};

export default Quote;
