import { ConnectionType } from './auth.js';
import { Product as PrismaProduct } from '@prisma/client';

export type PickingStatus = 'pending' | 'backorder' | 'completed' | 'unavailable';

// Use the Prisma-generated Product type as the source of truth.
// This ensures your types always match your database schema.
export type Product = PrismaProduct;

export interface ClientProduct {
    productId: number;
    productName: string;
    barcode: string;
    sku: string;
    price: number;
    quantityOnHand: number;
    companyId: string;
    externalItemId: string;
    taxCodeRef: string;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface EnrichableProduct {
    sku: string;
    productName: string;
    barcode?: string | null;
    price?: number | string;
    quantity_on_hand?: number | string;
    is_archived?: boolean;
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
