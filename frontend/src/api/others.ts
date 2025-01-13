import { apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';
import { Customer } from '../utils/types';


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

export const getCustomers = async () => {
  const customers = await apiCallGet(`getCustomers`);
  if (customers.error) {
    throw new Error(customers.error);
  } else {
    return customers;
  }
};

export const saveCustomers = async (customers: Customer[]) => {
  const data = await apiCallPost(`saveCustomers`, customers);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const getCustomerId = async (customerName: string) => {
  const data = await apiCallGet(`getCustomerId/${customerName}`);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const getProductInfo =  async (productId: number) => {
  const response = await apiCallGet(`getProduct/${productId}`);
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const getAllProducts = async () => {
  const response = await apiCallGet(`getAllProducts`);
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const saveProductForLater = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('saveProductForLater', { quoteId, productId });
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const setProductUnavailable = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('setProductUnavailable', { quoteId, productId });
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

export const setProductFinished = async (quoteId: number, productId: number) => {
  const response = await apiCallPut('setProductFinished', { quoteId, productId });
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;  
  }
}

