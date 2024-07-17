
export interface ProductDetail {
    sku: string;
    pickingQty: number;
    originalQty: number;
}
  
export interface ProductInfo {
    [productName: string]: ProductDetail;
}
  
export interface QuoteData {
    customer: string;
    productInfo: ProductInfo;
    totalAmount: number;
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
    SKU: string;
    pickingQty: number;
    originalQty: number;
    qtyOnHand: number;
}