import { apiCallGet, apiCallPut } from '../utils/apiHelpers';

export const extractQuote = async (quoteId: number) => {
    const url = `estimate/${quoteId}`;
    const data = await apiCallGet(url);
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data;
    }
};

export const getCustomerQuotes = async (customerId: string) => {
  const url = `getEstimates/${customerId}`;
  const data = await apiCallGet(url);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

// export const saveQuote = async (quote: QuoteData | null) => {
//   const data = await apiCallPost(`saveQuote`, { quote });
//   if (data.error) {
//     throw new Error(data.error);
//   } else {
//     return data;
//   }
// };

export const barcodeScan = async (barcode: string, quoteId: number, newQty: number) => {
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

export const addProductToQuote = async (productName: string, quoteId: number, qty: number) => {
  const data = await apiCallPut('addProduct', { productName, quoteId, qty });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}

export const adjustProductQty = async (quoteId: number, productId: number, newQty: number) => {
  const data = await apiCallPut(`adjustProductQty`, {quoteId, productId, newQty});
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
    const response = await apiCallPut('quote-status', { quoteId, newStatus });
    return response;
  } catch (error) {
    throw new Error('Failed to update quote status');
  }
};
