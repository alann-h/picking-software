
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