import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ProductDetail, QuoteData } from '../utils/types';
import { useSnackbarContext } from './SnackbarContext';

/**
 * Props for the QuoteInvoiceModal component.
 */
interface QuoteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteData;
  onProceed: (_newStatus: string) => Promise<void>;
}

/**
 * A modal to review products with specific statuses before converting a quote to an invoice.
 * It provides clear user feedback during and after the confirmation process.
 */
const QuoteInvoiceModal: React.FC<QuoteInvoiceModalProps> = ({
  isOpen,
  onClose,
  quoteData,
  onProceed,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { handleOpenSnackbar } = useSnackbarContext();

  const productsToReview = React.useMemo(() => {
    if (!quoteData?.productInfo) return [];
    return Object.values(quoteData.productInfo).filter((product) =>
      ['pending', 'backorder', 'unavailable'].includes(product.pickingStatus)
    );
  }, [quoteData]);

  const hasPendingProducts = React.useMemo(() => {
    return productsToReview.some((product) => product.pickingStatus === 'pending');
  }, [productsToReview]);

  /**
   * Maps a product status to a specific color for the Chip component.
   * @param {string} status - The picking status of the product.
   * @returns 'error' | 'warning' | 'info' - The color for the Chip.
   */
  const getStatusChipColor = (status: string): 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'unavailable':
        return 'error';
      case 'backorder':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'info';
    }
  };

  /**
   * Handles the "Proceed" button click.
   * Sets loading state, calls the onProceed prop, and handles any potential errors.
   */
  const handleProceed = async () => {
    setIsLoading(true);
    try {
      await onProceed('checking');
      onClose();
    } catch (err) {
      console.error('Failed to convert to invoice:', err);
      handleOpenSnackbar('Failed to convert to invoice', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
    }
  }, [isOpen]);

  const renderContent = () => {
    if (productsToReview.length > 0) {
      return (
        <>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Attention Required</AlertTitle>
            The following products have statuses that need review. Please resolve any
            <strong> &apos;pending&apos;</strong> items before you can proceed.
          </Alert>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsToReview.map((product: ProductDetail) => (
                  <TableRow key={product.productId}>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.productName}</TableCell>
                    <TableCell align="center">{`${product.pickingQty}/${product.originalQty}`}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={product.pickingStatus}
                        color={getStatusChipColor(product.pickingStatus)}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      );
    }
    return (
      <Alert severity="success">
        <AlertTitle>Ready to Go!</AlertTitle>
        All products have been checked and are ready for admin review.
      </Alert>
    );
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="primary" />
        Review Before Sending To Admin
      </DialogTitle>
      <DialogContent>
        {renderContent()}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleProceed}
          variant="contained"
          disabled={hasPendingProducts || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Processing...' : 'Confirm & Convert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteInvoiceModal;
