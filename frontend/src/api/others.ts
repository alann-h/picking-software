import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { getUserId } from '../utils/storage';
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
  const userId = getUserId();
  const customers = await apiCallGet(`getCustomers/${userId}`);
  if (customers.error) {
    throw new Error(customers.error);
  } else {
    return customers
  }
}

export const saveCustomers = async (customers: Customer[]) => {
  const data = await apiCallPost(`saveCustomers`, customers);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data
  }
}

export const getCustomerId = async (customerName: string) => {
  const data = await apiCallGet(`getCustomerId/${customerName}`)
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data
  }
}