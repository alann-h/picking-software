import { apiCallGet, apiCallPut } from '../utils/apiHelpers';

export const extractQuote = async (quoteId: number) => {
    const url = `quotes/${quoteId}`;
    const data = await apiCallGet(url);
    return data;
};

export const getCustomerQuotes = async (customerId: number) => {
  const url = `quotes/customer/${customerId}`;
  const data = await apiCallGet(url);
  return data;
};

export const addProductToQuote = async (productId: number, quoteId: number, qty: number) => {
  const data = await apiCallPut('quotes/products', { productId, quoteId, qty });
  return data;
}

export const adjustProductQty = async (quoteId: number, productId: number, newQty: number) => {
  const data = await apiCallPut(`quotes/products/qty`, { quoteId, productId, newQty });
  return data;
}

export const getQuotesWithStatus = async (status: string) => {
  const response = await apiCallGet(`quotes?status=${status}`);
  return response;
};

export const updateQuoteStatus = async (quoteId: number, newStatus: string) => {
  const response = await apiCallPut('quotes/status', { quoteId, newStatus });
  return response;
};

export const updateQuoteInQuickBooks = async (quoteId: number) => {
  const response = await apiCallPut(`quotes/${quoteId}/quickbooks`, {});
  return response;
};

export const barcodeScan = async (barcode: string, quoteId: number, newQty: number) => {
  const data = await apiCallPut('quotes/products/scan', { barcode, quoteId, newQty });
  return data;
};
