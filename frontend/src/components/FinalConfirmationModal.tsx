import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, AlertTitle, CircularProgress,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ProductDetail } from '../utils/types';

interface FinalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  backorderProducts: ProductDetail[];
}

const FinalConfirmationModal: React.FC<FinalConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  backorderProducts,
}) => {
  const hasBackorder = backorderProducts.length > 0;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {hasBackorder ? <WarningAmberIcon color="warning" /> : <CheckCircleOutlineIcon color="success" />}
        Confirm Invoice Finalisation
      </DialogTitle>
      <DialogContent>
        {hasBackorder ? (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Backordered Items Detected</AlertTitle>
              You are about to finalise this quote with items on backorder. Do you wish to proceed?
            </Alert>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backorderProducts.map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell align="center">{`${product.pickingQty}/${product.originalQty}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Alert severity="success">
            <AlertTitle>Ready to Finalise</AlertTitle>
            All items are accounted for. Are you sure you want to finalise this invoice and send it to QuickBooks?
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={hasBackorder ? "warning" : "primary"}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Processing...' : 'Yes, Proceed'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FinalConfirmationModal;