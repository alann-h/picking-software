import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { SYNC_BASE } from './config';

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  updatedProducts: number;
  newProducts: number;
  totalCustomers?: number;
  errors: string[];
  duration: number;
}

interface SyncResponse {
  message: string;
  result: SyncResult;
}

// Sync all products from accounting system (QuickBooks/Xero)
export const syncAllProducts = async (): Promise<SyncResult> => {
  const response = await apiCallPost(`${SYNC_BASE}/products`, {}) as SyncResponse;
  return response.result;
};

// Sync Settings Management
export interface SyncSettings {
  id?: string;
  enabled: boolean;
  lastSyncTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SyncSettingsResponse {
  message: string;
  settings: SyncSettings;
}

// Get sync settings
export const getSyncSettings = async (): Promise<SyncSettings> => {
  const response = await apiCallGet(`${SYNC_BASE}/settings`) as SyncSettingsResponse;
  return response.settings;
};

// Save sync settings
export const saveSyncSettings = async (settings: Omit<SyncSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<SyncSettings> => {
  const response = await apiCallPost(`${SYNC_BASE}/settings`, settings) as SyncSettingsResponse;
  return response.settings;
};

// Quote Sync Management
export interface QuoteSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ quoteId?: string; error: string; customerName?: string }>;
  duration: number;
}

interface QuoteSyncResponse {
  message: string;
  result: QuoteSyncResult;
}

// Sync all pending quotes from accounting system (QuickBooks/Xero)
export const syncAllQuotes = async (): Promise<QuoteSyncResult> => {
  const response = await apiCallPost(`${SYNC_BASE}/quotes`, {}) as QuoteSyncResponse;
  return response.result;
};
