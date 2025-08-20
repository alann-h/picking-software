export interface ProductDetail {
    sku: string;
    pickingQty: number;
    originalQty: number;
    pickingStatus: string;
    productName: string;
    productId: number;
    barcode: string;
    qtyOnHand: number;
    price: number;
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
    totalAmount: number;
    customerName: string;
    customerId: number;
    lastModified: string;
    preparerNames?: string;
    orderStatus: string;
    timeStarted: string;
    timeTaken: string;
}

export interface Run {
  id: string;
  companyid: string;
  created_at: string;
  run_number: number;
  status: 'pending' | 'checking' | 'finalised';
  customername?: string;
  totalamount?: number; 
  quotes: RunQuote[];
}

export interface RunQuote {
  quoteId: number;
  customerName: string;
  totalAmount: number;
  priority: number;
  orderStatus: string;
}

export interface UserStatusResponse {
  isAdmin: boolean;
  companyId: string | null;
  name: string | null;
  email: string | null;
}

export interface ApiErrorPayload {
  message: string;
  productName?: string;
  quoteId?: string;
  error?: boolean;
}

export interface ApiErrorWrapper {
  source: string;
  data: ApiErrorPayload;
}

