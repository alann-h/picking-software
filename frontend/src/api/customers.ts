import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { Customer } from '../utils/types';

export const getCustomers = async () => {
  const customers = await apiCallGet(`customers/`);
  if (customers.error) {
    throw new Error(customers.error);
  } else {
    return customers;
  }
};

export const saveCustomers = async (customers: Customer[]) => {
  const data = await apiCallPost(`customers/`, customers);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};