import { QueryResultRow } from 'pg';
import { Customer } from './customer.js';

export { Customer };

export interface KyteLineItem {
  quantity: number;
  productName: string;
  originalText: string;
}

export interface MatchedLineItem extends KyteLineItem {
  productId: number | null;
  sku: string | null;
  barcode: string | null;
  externalItemId: string | null;
  price: number;
  taxCodeRef: string | null;
  matched: boolean;
}

export interface KyteOrder {
  number: string;
  date: string;
  itemsDescription: string;
  total: number;
  customerName: string;
  customerId: string | null;
  lineItems: KyteLineItem[] | MatchedLineItem[];
  observation: string;
}

export interface ProcessedKyteOrder extends Omit<KyteOrder, 'customerId' | 'lineItems'> {
  lineItems: MatchedLineItem[];
  customerId: string;
}


export interface ConversionHistoryRecord {
  orderNumber: string;
  estimateId: string | null;
  quickbooksUrl: string | null;
  status: 'success' | 'failed';
  errorMessage: string | null;
  createdAt: Date | string;
}

export interface ConversionHistoryRecordFromDB {
    kyte_order_number: string;
    quickbooks_estimate_id: string | null;
    quickbooks_url: string | null;
    status: 'success' | 'failed';
    error_message: string | null;
    created_at: Date;
}

export interface QuickBooksEstimateResult {
  success: true;
  estimateId: string;
  estimateNumber: string;
  quickbooksUrl: string;
  message: string;
}

export interface ConversionData {
  kyteOrderNumber: string;
  quickbooksEstimateId: string | null;
  quickbooksUrl: string | null;
  status: 'success' | 'failed';
  errorMessage: string | null;
}

export interface ProcessResultSuccess {
  orderNumber: string;
  success: true;
  estimateId: string;
  estimateNumber: string;
  quickbooksUrl: string;
  message: string;
}

export interface ProcessResultFailure {
  orderNumber: string;
  success: false;
  message: string;
}

export type ProcessResult = ProcessResultSuccess | ProcessResultFailure;

export interface ProductFromDB {
  id: number;
  product_name: string;
  sku: string;
  barcode: string;
  price: number;
  external_item_id: string;
  tax_code_ref: string;
}

export interface OAuthClient {
    makeApiCall: (options: any) => Promise<any>;
}

// A generic query function type
export type Query = <T extends QueryResultRow = any>(
  text: string,
  params: any[]
) => Promise<T[]>;
