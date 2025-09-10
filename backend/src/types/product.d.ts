import { ConnectionType } from './auth.js';

export type PickingStatus = 'pending' | 'backorder' | 'completed' | 'unavailable';

export interface Product {
    id: number;
    company_id: string;
    product_name: string;
    sku: string;
    barcode: string | null;
    external_item_id: string | null;
    category: string | null;
    tax_code_ref: string | null;
    price: string;
    quantity_on_hand: string;
    is_archived: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface ClientProduct {
    productId: number;
    productName: string;
    barcode: string;
    sku: string;
    price: number;
    quantityOnHand: number;
    companyId: string;
    category: string | null;
    externalItemId: string;
    isArchived: boolean;
}

export interface EnrichableProduct {
    sku: string;
    productName: string;
    barcode?: string | null;
    price?: number | string;
    quantity_on_hand?: number | string;
    is_archived?: boolean;
    category?: string | null;
    external_item_id?: string | null;
    tax_code_ref?: string | null;
}

export interface EnrichedProduct extends EnrichableProduct {
    price: number;
    quantity_on_hand: number;
    external_item_id: string | null;
    tax_code_ref: string | null;
}

export interface NewProductData {
    productName: string;
    barcode: string;
    sku: string;
}

export interface UpdateProductPayload {
    productName?: string;
    price?: number;
    barcode?: string;
    quantityOnHand?: number;
    sku?: string;
}

export interface QuoteItemStatusResult {
    status: 'success' | 'error';
    message: string;
    newStatus: PickingStatus;
}

export interface QuoteItemFinishResult {
    pickingQty: number;
    newStatus: PickingStatus;
    message: string;
}
