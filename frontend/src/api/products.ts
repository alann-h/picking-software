import { apiCallDelete, apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';

export const barcodeToName = async (barcode: string) => {
  const data = await apiCallGet(`products/barcode/${barcode}`);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const uploadProducts = async (file: File) => {
    const formData = new FormData();
    formData.append('input', file);
  
    const data = await apiCallPost('upload', formData);
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data;
    }
};

export const getProductInfo =  async (productId: number) => {
  const response = await apiCallGet(`producst/${productId}`);
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const getAllProducts = async () => {
  const response = await apiCallGet(`products`);
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const saveProductForLater = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('products/for-later', { quoteId, productId });
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const setProductUnavailable = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('products/unavailable', { quoteId, productId });
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const setProductFinished = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('products/finished', { quoteId, productId });
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const updateProductDb = async (productId: number) => {
  const response = await apiCallPut(`products/${productId}`, {});
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const deleteProductDb = async (productId: number) => {
  const response = await apiCallDelete(`products/${productId}`);
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const addProductDb = async (productName: string, sku: string, barcode: string ) => {
  const response = await apiCallPost(`products`, { productName, sku, barcode });
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}
