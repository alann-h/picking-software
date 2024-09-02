export interface ProductDetail {
    sku: string;
    pickingQty: number;
    originalQty: number;
    pickingStatus: string;
    productName: string;
    productId: number;
    barcode: string;
}
  
export interface ProductInfo {
    [barcode: string]: ProductDetail;
}
  
export interface QuoteData {
    customerName: string;
    productInfo: ProductInfo;
    totalAmount: number;
    timeStarted: string;
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

export interface ProductDetailsDB {
    sku: string;
    pickingQty: number;
    originalQty: number;
    qtyOnHand: number;
    pickingStatus: string;
    productId: number;
}

export interface Product {
    productName: string;
    barcode: number;
}