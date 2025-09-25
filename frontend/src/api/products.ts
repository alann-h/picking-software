import { apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';
import { Product } from '../utils/types';
import { PRODUCTS_BASE } from './config';

export const barcodeToName = async (barcode: string) => {
  const data = await apiCallGet(`${PRODUCTS_BASE}/barcode/${barcode}`);
  return data;
};

export const uploadProducts = async (file: File) => {
    const formData = new FormData();
    formData.append('input', file);
  
    const data = await apiCallPost('api/upload', formData);
    return data;
};

export const getProductInfo =  async (productId: number) => {
  const response = await apiCallGet(`${PRODUCTS_BASE}/${productId}`);
  return response;  
}

export const getAllProducts = async () => {
  const response = await apiCallGet(PRODUCTS_BASE);
  return response;  
}

export const saveProductForLater = async (quoteId: string, productId: number) => {
  const response = await apiCallPut(`${PRODUCTS_BASE}/for-later`, { quoteId, productId });
  return response;  
}

export const setProductUnavailable = async (quoteId: string, productId: number) => {
  const response = await apiCallPut(`${PRODUCTS_BASE}/unavailable`, { quoteId, productId });
  return response;
}

export const setProductFinished = async (quoteId: string, productId: number) => {
  const response = await apiCallPut(`${PRODUCTS_BASE}/finished`, { quoteId, productId });
  return response;
}

export const updateProductDb = async (productId: number, productData: Partial<Product>) => {
  const response = await apiCallPut(`${PRODUCTS_BASE}/${productId}`, productData);
  return response;
}

export const setProductArchiveStatus = async (productId: number, isArchived: boolean) => {
  const response = await apiCallPut(`${PRODUCTS_BASE}/${productId}/archive-status`, { isArchived });
  return response;  
}

export const addProductDb = async (productName: string, sku: string, barcode: string, category?: string) => {
  const response = await apiCallPost(PRODUCTS_BASE, { productName, sku, barcode, category });
  return response;
}

export const getJobProgress = async (jobId: string) => {
  const response = await apiCallGet(`jobs/${jobId}/progress`);
  return response;
}
