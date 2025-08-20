import React, { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Paper, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Box, useTheme, 
  useMediaQuery, Button, TextField, Chip
} 
from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ReceiptIcon from '@mui/icons-material/Receipt';

import BarcodeListener from './BarcodeListener';
import CameraScannerModal from './CameraScannerModal';
import ProductDetailsQuote from './ProductDetailsQuote';
import AdjustQuantityModal from './AdjustQuantityModal';
import AddProductModal from './AddProductModal';
import ProductRow from './ProductRow';
import ProductFilter, { SortField } from './ProductFilter';
import QuoteInvoiceModal from './QuoteInvoiceModal';
import FinalConfirmationModal from './FinalConfirmationModal';
import BarcodeModal from './BarcodeModal';
import { useModalState } from '../utils/modalState';
import { useAuth } from '../hooks/useAuth';
import { useQuoteManager } from './useQuote';
import { getStatusColor } from '../utils/other';

const useQuery = () => new URLSearchParams(useLocation().search);

const Quote: React.FC = () => {
  const query = useQuery();
  const quoteId = Number(query.get('id'));
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { modalState, closeModal, openModal } = useModalState();
  const { isAdmin } = useAuth();
  
  const { quoteData, actions, pendingStates } = useQuoteManager(quoteId, openModal);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<SortField | ''>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [pickerNote, setPickerNote] = useState(quoteData?.pickerNote || '');

  const productArray = useMemo(() => Object.values(quoteData.productInfo), [quoteData.productInfo]);

  const displayedProducts = useMemo(() => {
    let products = [...productArray];
    if (searchTerm) {
      products = products.filter(p => 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pickingStatus.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortField) {
      products.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return products;
  }, [productArray, searchTerm, sortField, sortOrder]);

  const { hasPendingProducts, backorderProducts } = useMemo(() => {
    const pending = productArray.some(p => p.pickingStatus === 'pending');
    const backorder = productArray.filter(p => p.pickingStatus === 'backorder');
    return { hasPendingProducts: pending, backorderProducts: backorder };
  }, [productArray]);

  const handleMainActionClick = () => {
    if (quoteData.orderStatus === 'checking') {
      if (hasPendingProducts) {
        alert('Please resolve all "pending" items before finalising the invoice.');
      } else {
        openModal('finalConfirmation');
      }
    } else {
      actions.openQuoteInvoiceModal();
    }
  };
  
  const handleSaveNote = () => {
    actions.saveNote(pickerNote);
  };

  const handleCameraScanSuccess = useCallback((barcode: string) => {
    closeModal();
    actions.handleBarcodeScan(barcode);
  }, [closeModal, actions]); 


  return (
    <Paper elevation={3} sx={{ padding: { xs: 1, sm: 2, md: 3 }, margin: { xs: 1, sm: 2 } }}>
      <title>{`Smart Picker | Quote: ${quoteId}`}</title>
      
      {/* Modals now receive actions directly from the hook */}
      <BarcodeListener onBarcodeScanned={actions.handleBarcodeScan} disabled={modalState.isOpen} />
      
      {modalState.type === 'barcodeModal' && modalState.data && <BarcodeModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={modalState.data.onConfirm} availableQty={modalState.data.availableQty} productName={modalState.data.productName} />}
      {modalState.type === 'cameraScanner' && <CameraScannerModal isOpen={modalState.isOpen} onClose={closeModal} onScanSuccess={handleCameraScanSuccess} />}
      {modalState.type === 'productDetails' && modalState.data && <ProductDetailsQuote open={modalState.isOpen} onClose={closeModal} productName={modalState.data.name} productDetails={modalState.data.details} />}
      {modalState.type === 'adjustQuantity' && modalState.data && <AdjustQuantityModal isOpen={modalState.isOpen} onClose={closeModal} productName={modalState.data.productName} currentQty={modalState.data.pickingQty} productId={modalState.data.productId} onConfirm={actions.adjustQuantity} isLoading={pendingStates.isAdjustingQuantity} />}
      {modalState.type === 'addProduct' && <AddProductModal open={modalState.isOpen} onClose={closeModal} onSubmit={actions.addProduct} isSubmitting={pendingStates.isAddingProduct}/>}
      {modalState.type === 'quoteInvoice' && <QuoteInvoiceModal isOpen={modalState.isOpen} onClose={closeModal} quoteData={quoteData} onProceed={() => actions.setQuoteChecking('checking')} isLoading={pendingStates.isQuoteChecking} />}
      {modalState.type === 'finalConfirmation' && <FinalConfirmationModal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={actions.finaliseInvoice} backorderProducts={backorderProducts} isLoading={pendingStates.isFinalising} />}
      
      {/* UI Rendering remains largely the same */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
            Quote no.{quoteId}
          </Typography>
          
          {/* Progress Indicator */}
          <Box sx={{ 
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            {(() => {
              const totalPicked = productArray.reduce((sum, p) => sum + Number(p.pickingQty), 0);
              const totalOriginal = productArray.reduce((sum, p) => sum + Number(p.originalQty), 0);
              const progressPercentage = totalOriginal > 0 ? (totalPicked / totalOriginal) * 100 : 0;
              
              return (
                <>
                  <Box sx={{ 
                    width: 120, 
                    height: 6, 
                    bgcolor: 'grey.200', 
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    border: `1px solid ${theme.palette.divider}`
                  }}>
                    <Box 
                      sx={{ 
                        width: `${Math.min(progressPercentage, 100)}%`, 
                        height: '100%', 
                        bgcolor: 'primary.main',
                        transition: 'width 0.3s ease-in-out',
                        borderRadius: 3
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {totalPicked}/{totalOriginal} boxes • {Math.round(progressPercentage)}%
                  </Typography>
                </>
              );
            })()}
          </Box>
        </Box>
      </Box>

      {/* Header Info */}
      <Box sx={{ 
        mb: 3, 
        p: 3, 
        bgcolor: 'grey.50', 
        borderRadius: 3, 
        border: '1px solid', 
        borderColor: 'grey.200',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        elevation: 3
      }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
          gap: 3,
          alignItems: 'center'
        }}>
          {/* Customer Name */}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Customer
            </Typography>
            <Typography variant="h6" fontWeight={600} color="primary">
              {quoteData.customerName}
            </Typography>
          </Box>
          
          {/* Order Status */}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Status
            </Typography>
            <Chip
              label={quoteData.orderStatus}
              sx={{
                backgroundColor: getStatusColor(quoteData.orderStatus),
                color: 'white',
                textTransform: 'capitalize',
                fontWeight: 600,
                fontSize: '0.875rem',
                height: 32
              }}
            />
          </Box>

          {/* Last Modified */}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Last Modified
            </Typography>
            <Typography variant="body2" fontWeight={500} color="text.primary">
              {quoteData.lastModified}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Actions and Filters */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.50', 
          borderRadius: 2, 
          border: '1px solid', 
          borderColor: 'grey.200',
          mb: 2
        }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
            Customer/Sales Note
          </Typography>
          <Typography variant="body2" color="text.primary" sx={{ fontStyle: 'italic' }}>
            {quoteData.orderNote || 'No note provided.'}
          </Typography>
        </Box>
        

        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" color="secondary" onClick={() => openModal('cameraScanner')} disabled={quoteData.orderStatus === 'finalised'}>
            <CameraAltIcon /> {!isMobile && "Scan"}
          </Button>
          <Button variant="contained" color="primary" onClick={actions.openAddProductModal} disabled={quoteData.orderStatus === 'finalised'}>
            <AddIcon /> {!isMobile && "Add Product"}
          </Button>
        </Box>
      </Box>
      
      <ProductFilter searchTerm={searchTerm} sortField={sortField} sortOrder={sortOrder} onSearchChange={(e) => setSearchTerm(e.target.value)} onSortFieldChange={(e) => setSortField(e.target.value as SortField)} onSortOrderChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} />
      
      {/* Product Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell><TableCell>Name</TableCell><TableCell>Quantity</TableCell><TableCell>Picking Status</TableCell><TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedProducts.map((product) => (
              <ProductRow
                key={product.productId}
                product={product}
                actions={actions}
                pendingStates={pendingStates}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Picker's Note */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Picker&apos;s Note</Typography>
        <TextField label="Add any notes about preparing this order..." multiline rows={4} fullWidth variant="outlined" value={pickerNote} onChange={(e) => setPickerNote(e.target.value)} disabled={quoteData.orderStatus === 'finalised'} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button variant="outlined" onClick={handleSaveNote} disabled={pendingStates.isSavingNote || pickerNote === (quoteData?.pickerNote || '') || quoteData.orderStatus === 'finalised'}>
            {pendingStates.isSavingNote ? 'Saving...' : "Save Picker's Note"}
          </Button>
        </Box>
      </Box>

      {/* Final Action Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="contained" size="large" onClick={handleMainActionClick} disabled={quoteData.orderStatus === 'finalised' || !isAdmin || pendingStates.isFinalising} color='warning'>
          <ReceiptIcon sx={{ mr: 1 }} />
          {pendingStates.isFinalising ? 'Processing...' : (quoteData.orderStatus === 'checking' ? "Send To Quickbooks" : "Send To Admin")}
        </Button>
      </Box>
    </Paper>
  );
};

export default Quote;