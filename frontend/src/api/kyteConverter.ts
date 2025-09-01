import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { QUOTES_BASE } from './config';

export const uploadKyteCSV = async (csvContent: string) => {
  const response = await apiCallPost(`${QUOTES_BASE}/kyte-upload`, { csvContent });
  return response;
};

export const getCustomersForMapping = async () => {
  const response = await apiCallGet(`${QUOTES_BASE}/kyte-customers`);
    return response;
};

export const createQuickBooksEstimates = async (orders: any[]) => {
  const response = await apiCallPost(`${QUOTES_BASE}/kyte-create-estimates`, { orders });
  return response;
};
