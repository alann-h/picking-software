import { apiCallDelete, apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';

export const barcodeToName = async (barcode: string) => {
  const data = await apiCallGet(`products/barcode/${barcode}`);
  return data;
};

export const uploadProducts = async (file: File) => {
    const formData = new FormData();
    formData.append('input', file);
  
    const data = await apiCallPost('upload', formData);
    return data;
};

export const getProductInfo =  async (productId: number) => {
  const response = await apiCallGet(`products/${productId}`);
  return response;  
}

export const getAllProducts = async () => {
  const response = await apiCallGet(`products`);
  return response;  
}

export const saveProductForLater = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('products/for-later', { quoteId, productId });
  return response;  
}

export const setProductUnavailable = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('products/unavailable', { quoteId, productId });
  return response;
}

export const setProductFinished = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('products/finished', { quoteId, productId });
  return response;
}

export const updateProductDb = async (productId: number) => {
  const response = await apiCallPut(`products/${productId}`, {});
  return response;
}

export const deleteProductDb = async (productId: number) => {
  const response = await apiCallDelete(`products/${productId}`);
  return response;  
}

export const addProductDb = async (productName: string, sku: string, barcode: string ) => {
  const response = await apiCallPost(`products`, { productName, sku, barcode });
  return response;
}

export const getJobProgress = async (jobId: string) => {
  const response = await apiCallGet(`jobs/${jobId}/progress`);
  return response;
}
