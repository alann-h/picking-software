import { apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';
import { getUserId } from '../utils/storage';
import { QuoteData } from '../utils/types';

export const extractQuote = async (quoteId: string) => {
    const userId = getUserId();
    const url = `estimate/${quoteId}/${userId}`;
    const data = await apiCallGet(url);
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data;
    }
};

export const getCustomerQuotes = async (customerId: string) => {
  const userId = getUserId();
  const url = `getEstimates/${customerId}/${userId}`;
  const data = await apiCallGet(url);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const saveQuote = async (quote: QuoteData) => {
  const data = await apiCallPost(`saveQuote`, { quote });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const barcodeScan = async (barcode: string, quoteId: string, newQty: number) => {
  const data = await apiCallPut('productScan', { barcode, quoteId, newQty });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const barcodeToName = async (barcode: string) => {
  const data = await apiCallGet(`barcodeToName/${barcode}`);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

export const addProductToQuote = async (productName: string, quoteId: string, qty: number) => {
  const data = await apiCallPut('addProduct', { productName, quoteId, qty });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}

export const adjustProductQty = async (productName: string, quoteId: string, newQty: number) => {
  const data = await apiCallPut(`adjustProductQty`, {quoteId, productName, newQty});
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}
