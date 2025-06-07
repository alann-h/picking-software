import { apiCallGet, apiCallPut } from '../utils/apiHelpers';

export const extractQuote = async (quoteId: number) => {
    const url = `quotes/${quoteId}`;
    const data = await apiCallGet(url);
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data;
    }
};

export const getCustomerQuotes = async (customerId: number) => {
  const url = `quotes/customer/${customerId}`;
  const data = await apiCallGet(url);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const addProductToQuote = async (productId: number, quoteId: number, qty: number) => {
  const data = await apiCallPut('quotes/products', { productId, quoteId, qty });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}

export const adjustProductQty = async (quoteId: number, productId: number, newQty: number) => {
  const data = await apiCallPut(`quotes/products/qty`, { quoteId, productId, newQty });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}

export const getQuotesWithStatus = async (status: string) => {
  try {
    const response = await apiCallGet(`quotes?status=${status}`);
    return response;
  } catch (error) {
    throw new Error('Failed to fetch quotes');
  }
};

export const updateQuoteStatus = async (quoteId: number, newStatus: string) => {
  try {
    const response = await apiCallPut('quotes/status', { quoteId, newStatus });
    return response;
  } catch (error) {
    throw new Error('Failed to update quote status');
  }
};

export const updateQuoteInQuickBooks = async (quoteId: number) => {
  try {
    const response = await apiCallPut(`quotes/${quoteId}/quickbooks`, {});
    return response;
  } catch (error) {
    throw new Error('Failed to update quote status');
  }
};

export const barcodeScan = async (barcode: string, quoteId: number, newQty: number) => {
  const data = await apiCallPut('quotes/products/scan', { barcode, quoteId, newQty });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};
