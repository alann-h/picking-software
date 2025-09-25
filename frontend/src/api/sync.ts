import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { SYNC_BASE } from './config';

export interface Category {
  id: string;
  name: string;
  fullyQualifiedName: string;
  active: boolean;
}

export interface SyncResult {
  success: boolean;
  totalProducts: number;
  updatedProducts: number;
  newProducts: number;
  errors: string[];
  duration: number;
}

export interface SyncWithCategoriesRequest {
  selectedCategoryIds: string[];
}

interface CategoriesResponse {
  message: string;
  categories: Category[];
}

interface SyncResponse {
  message: string;
  result: SyncResult;
}

interface AllCompaniesSyncResponse {
  message: string;
  results: { [companyId: string]: SyncResult };
}

// Get all categories from QuickBooks Online
export const getCategories = async (): Promise<Category[]> => {
  const response = await apiCallGet(`${SYNC_BASE}/categories`) as CategoriesResponse;
  return response.categories;
};

export const refreshCategories = async (): Promise<Category[]> => {
  const response = await apiCallPost(`${SYNC_BASE}/categories/refresh`, {}) as CategoriesResponse;
  return response.categories;
};

// Sync all products from QuickBooks Online
export const syncAllProducts = async (): Promise<SyncResult> => {
  const response = await apiCallPost(`${SYNC_BASE}/products`, {}) as SyncResponse;
  return response.result;
};

// Sync products with selected categories
export const syncWithCategories = async (selectedCategoryIds: string[]): Promise<SyncResult> => {
  const response = await apiCallPost(`${SYNC_BASE}/products/categories`, {
    selectedCategoryIds
  }) as SyncResponse;
  return response.result;
};

// Sync all companies (admin only)
export const syncAllCompanies = async (): Promise<{ [companyId: string]: SyncResult }> => {
  const response = await apiCallPost(`${SYNC_BASE}/products/all-companies`, {}) as AllCompaniesSyncResponse;
  return response.results;
};

// Sync Settings Management
export interface SyncSettings {
  id?: string;
  enabled: boolean;
  selectedCategoryIds: string[];
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
