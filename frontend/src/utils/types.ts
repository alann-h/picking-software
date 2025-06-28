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
    [productId: number]: ProductDetail;
}
  
export interface QuoteData {
    customerName: string;
    productInfo: ProductInfo;
    totalAmount: number;
    timeStarted: string;
    lastModified: string;
    orderStatus: string;
}

export interface QuoteProps {
    quoteData: QuoteData | null;
    quoteNumber: string;
    currentPage: number;
    itemsPerPage: number;
}
export interface BarcodeListenerProps {
    onBarcodeScanned: (barcode: string) => void;
    disabled?: boolean; 
}
export type QuoteUpdateFunction = (updater: (prevQuoteData: QuoteData) => Partial<QuoteData>) => void;

export interface Customer {
    customerName: string;
    customerId: number;
}
export type SnackbarSeverity = 'error' | 'success' | 'info' | 'warning';
export interface SnackbarContextType {
    openSnackbar: boolean;
    snackbarMessage: string;
    snackbarSeverity: SnackbarSeverity;
    handleOpenSnackbar: (message: string, severity: 'error' | 'success' | 'info' | 'warning') => void;
    handleCloseSnackbar: () => void;
}
// need to clean up below type

export interface ProductDetailsDB {
    sku: string;
    pickingQty: number;
    originalQty: number;
    qtyOnHand: number;
    pickingStatus: string;
    productId: number;
    barcode: string
}
export interface Product {
    productId: number;
    productName: string;
    barcode: string;
    sku: string;
    quantityOnHand: number | null;
    price: number | null;
    companyId: number;
    category: string | null;
    qboItemId: string;
  }
export interface UserData {
    id: string;
    email: string;
    password: string;
    given_name: string;
    family_name: string;
    is_admin: boolean;
    company_id: number;
}
