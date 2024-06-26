
interface ProductDetails {
    SKU: string;
    pickingQty: number;
    originalQty: number;
}
  
interface ProductInfo {
    [productName: string]: ProductDetails;
}
  
export interface QuoteData {
    customer: string;
    productInfo: ProductInfo;
    totalAmount: string;
}

export interface QuoteProps {
    quoteData: QuoteData | null;
    quoteNumber: string;
    currentPage: number;
    itemsPerPage: number;
}
export interface BarcodeListenerProps {
    onBarcodeScanned: (barcode: string) => void;
}

export interface Customer {
    name: string;
    id: string;
}
export interface SnackbarContextType {
    openSnackbar: boolean;
    snackbarMessage: string;
    snackbarSeverity: 'error' | 'success';
    handleOpenSnackbar: (message: string, severity: 'error' | 'success') => void;
    handleCloseSnackbar: () => void;
  }