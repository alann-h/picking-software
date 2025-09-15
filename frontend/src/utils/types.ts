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
  quoteId: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  productInfo: Record<string, ProductDetail>;
  totalAmount: number;
  orderStatus: string;
  lastModified: string;
  timeStarted?: string;
  companyId: string;
  pickerNote?: string;
  orderNote?: string;
}

export interface BarcodeListenerProps {
    onBarcodeScanned: (_barcode: string) => void;
    disabled?: boolean; 
}
export type QuoteUpdateFunction = (_updater: (_prevQuoteData: QuoteData) => Partial<QuoteData>) => void;

export interface Customer {
    customerName: string;
    customerId: string;
}
export type SnackbarSeverity = 'error' | 'success' | 'info' | 'warning';
export interface SnackbarContextType {
    openSnackbar: boolean;
    snackbarMessage: string;
    snackbarSeverity: SnackbarSeverity;
    handleOpenSnackbar: (_message: string | object, _severity: 'error' | 'success' | 'info' | 'warning') => void;
    handleCloseSnackbar: () => void;
}
export interface Product {
    productId: number;
    productName: string;
    barcode: string;
    sku: string;
    quantityOnHand: number;
    price: number;
    companyId: string;
    category: string;
    externalItemId: string;
    isArchived: boolean;
  }
export interface UserData {
    id: string;
    display_email: string;
    password?: string;
    given_name: string;
    family_name: string;
    is_admin: boolean;
    company_id: string;
}

export interface UserUpdateData {
  email?: string;
  password?: string;
  givenName?: string;
  familyName?: string;
  isAdmin?: boolean;
}

export interface QuoteSummary {
    id: string;
    quoteNumber: string;
    totalAmount: number;
    customerName: string;
    customerId: string;
    lastModified: string;
    preparerNames?: string;
    orderStatus: string;
    timeStarted: string;
    timeTaken: string;
    pickerNote?: string;
}

export interface Run {
  id: string;
  company_id: string;
  created_at: string;
  run_number: number;
  status: 'pending' | 'checking' | 'finalised';
  customer_name?: string;
  total_amount?: number;
  quotes: RunQuote[];
}

export interface RunQuote {
  quoteId: string;
  quoteNumber: string;
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
  connectionType: 'qbo' | 'xero' | 'none';
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

