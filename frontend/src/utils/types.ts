
interface ProductDetails {
    SKU: string;
    Qty: number;
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
