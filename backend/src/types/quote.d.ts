import { ConnectionType } from './auth.js';
import { PickingStatus } from './product.js';

export type OrderStatus = 'pending' | 'checking' | 'finalised' | 'cancelled' | 'assigned';

export interface CustomerQuote {
    id: number | string;
    quoteNumber: string;
    totalAmount: number;
    customerName: string;
    lastModified: string | Date;
}

export interface ProductInfo {
    productName: string;
    productId: number;
    sku: string;
    pickingQty: number;
    originalQty: number;
    pickingStatus: PickingStatus;
    price: number;
    quantityOnHand: number;
    companyId: string;
    barcode: string | null;
    tax_code_ref: string | null;
}

export interface FilteredQuote {
    quoteId: string;
    quoteNumber: string;
    customerId: string;
    customerName: string;
    productInfo: Record<string, ProductInfo>;
    totalAmount: number;
    orderStatus: OrderStatus;
    lastModified: string;
    companyId: string;
    orderNote: string | null;
    externalSyncUrl: string | null;
}

export interface QuoteFetchError {
    error: true;
    quoteId: string;
    message: string;
    productName: string;
}

export interface QuoteFromDB {
    id: string;
    quote_number: string;
    customer_id: string;
    customer_name: string;
    total_amount: string;
    created_at: Date;
    updated_at: Date;
    status: OrderStatus;
    company_id: string;
    picker_note: string | null;
    order_note: string | null;
}

export interface QuoteItemFromDB {
    quote_id: string;
    product_id: number;
    product_name: string;
    original_quantity: string;
    picking_quantity: string;
    picking_status: PickingStatus;
    sku: string;
    price: string;
    company_id: string;
    barcode: string | null;
    tax_code_ref: string | null;
}

export interface CombinedQuoteItemFromDB extends QuoteFromDB, QuoteItemFromDB {}

export interface BarcodeProcessResult {
    productName: string;
    updatedQty: number;
    pickingStatus: PickingStatus;
}

export interface AddProductResult {
    status: 'new' | 'exists';
    productInfo: QuoteItemFromDB;
    totalAmount: string;
    lastModified?: Date;
}

export interface AdjustQuantityResult {
    pickingQty: number;
    originalQty: number;
    totalAmount: string;
}

export interface BulkDeleteResult {
    success: boolean;
    message: string;
    deletedCount?: number;
    deletedQuotes?: { id: string }[];
    errors?: { quoteId: string, error: string }[];
}
