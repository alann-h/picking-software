import { apiCallGet, apiCallPut, apiCallPost } from '../utils/apiHelpers';

export const extractQuote = async (quoteId: string) => {
    const url = `quotes/${quoteId}`;
    const data = await apiCallGet(url);
    return data;
};

export const getCustomerQuotes = async (customerId: string) => {
  const url = `quotes/customer/${customerId}`;
  const data = await apiCallGet(url);
  return data;
};

export const addProductToQuote = async (productId: number, quoteId: string, qty: number) => {
  const data = await apiCallPut('quotes/products', { productId, quoteId, qty });
  return data;
}

export const adjustProductQty = async (quoteId: string, productId: number, newQty: number) => {
  const data = await apiCallPut(`quotes/products/qty`, { quoteId, productId, newQty });
  return data;
}

export const getQuotesWithStatus = async (status: string) => {
  const response = await apiCallGet(`quotes?status=${status}`);
  return response;
};

export const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
  const response = await apiCallPut('quotes/status', { quoteId, newStatus });
  return response;
};

export const updateQuoteInQuickBooks = async (quoteId: string) => {
  const response = await apiCallPut(`quotes/${quoteId}/quickbooks`, {});
  return response;
};

export const barcodeScan = async (barcode: string, quoteId: string, newQty: number) => {
  const data = await apiCallPut('quotes/products/scan', { barcode, quoteId, newQty });
  return data;
};

export const savePickerNote = async (quoteId: string, note: string) => {
  const data = await apiCallPut('quotes/picker-note', { quoteId, note });
  return data;
}

export const deleteQuotesBulk = async (quoteIds: string[]) => {
  const response = await apiCallPost('quotes/bulk-delete', { quoteIds });
  return response;
};
