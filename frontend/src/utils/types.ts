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
    orderNote: string;
    pickerNote: string;
    quoteId: number;
}

export interface BarcodeListenerProps {
    onBarcodeScanned: (_barcode: string) => void;
    disabled?: boolean; 
}
export type QuoteUpdateFunction = (_updater: (_prevQuoteData: QuoteData) => Partial<QuoteData>) => void;

export interface Customer {
    customerName: string;
    customerId: number;
}
export type SnackbarSeverity = 'error' | 'success' | 'info' | 'warning';
export interface SnackbarContextType {
    openSnackbar: boolean;
    snackbarMessage: string;
    snackbarSeverity: SnackbarSeverity;
    handleOpenSnackbar: (_message: string, _severity: 'error' | 'success' | 'info' | 'warning') => void;
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
    quantityOnHand: number;
    price: number;
    companyId: number;
    category: string;
    qboItemId: string;
    isArchived: boolean;
  }
export interface UserData {
    id: string;
    display_email: string;
    password?: string;
    given_name: string;
    family_name: string;
    is_admin: boolean;
    companyid: number;
}

export interface UserUpdateData {
  email?: string;
  password?: string;
  givenName?: string;
  familyName?: string;
  isAdmin?: boolean;
}

export interface QuoteSummary {
    id: number;
    totalAmt: number;
    customerName: string;
    lastUpdatedTime: string;
    preparerNames?: string;
}

export interface Run {
  id: string;
  companyid: string;
  created_at: string;
  quoteid: number;
  run_number: number;
  status: 'pending' | 'checking' | 'finalised';
  customername?: string;
  totalamt?: number; 
}