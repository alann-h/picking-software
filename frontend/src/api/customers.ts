import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { Customer } from '../utils/types';
import { CUSTOMERS_BASE } from './config';

export const getCustomers = async () => {
  const customers = await apiCallGet(CUSTOMERS_BASE);
  return customers;
};

export const saveCustomers = async (customers: Customer[]) => {
  const data = await apiCallPost(CUSTOMERS_BASE, customers);
  return data;
};