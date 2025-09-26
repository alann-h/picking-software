import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { SYNC_BASE } from './config';

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  updatedProducts: number;
  newProducts: number;
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
