import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { Customer } from '../utils/types';

export const getCustomers = async () => {
  const customers = await apiCallGet(`customers/`);
  return customers;
};

export const saveCustomers = async (customers: Customer[]) => {
  const data = await apiCallPost(`customers/`, customers);
  return data;
};