// show a modal when clickinmg the convert to invoice button to show all unavailable, pending and backorder items to confirm. 
import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { ProductDetail, QuoteData } from '../utils/types';
import { getStatusColor } from '../utils/other';

interface QuoteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData;
//   onProceed: () => void;
}

const QuoteInvoiceModal: React.FC<QuoteInvoiceModalProps> = ({
  isOpen,
  onClose,
  quoteData,
//   onProceed,
}) => {

  const productsToReview = useMemo(() => {
    return Object.values(quoteData.productInfo).filter(
      (product) => ['pending', 'backorder', 'unavailable'].includes(product.pickingStatus)
    );
  }, [quoteData]);

  const hasPendingProducts = useMemo(() => {
    return productsToReview.some((product) => product.pickingStatus === 'pending');
  }, [productsToReview]);

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Review Before Converting to Invoice</DialogTitle>
      <DialogContent>
        {productsToReview.length > 0 ? (
          <>
            <Typography variant="body1" gutterBottom>
              The following products need attention before converting to an invoice:
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product Name</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productsToReview.map((product: ProductDetail) => (
                    <TableRow key={product.productId}>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.pickingQty}/{product.originalQty}</TableCell>
                      <TableCell>
                        <Typography style={{ color: getStatusColor(product.pickingStatus) }}>
                          {product.pickingStatus}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Typography variant="body1">
            All products are ready to be converted to an invoice.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button
        //   onClick={onProceed}
          color="primary"
          variant="contained"
          disabled={hasPendingProducts}
        >
          {hasPendingProducts ? 'Resolve Pending Items' : 'Proceed to Convert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteInvoiceModal;