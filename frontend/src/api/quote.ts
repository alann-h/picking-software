import { apiCallGet, apiCallPost } from '../utils/apiHelpers';
import { getUserId } from '../utils/storage';
import { QuoteData } from '../utils/types';



export const extractQuote = async (searchField: string, quoteId: string) => {
    const userId = getUserId();
    const url = `estimate/${quoteId}/${userId}?searchField=${searchField}`
    const data = await apiCallGet(url);
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data
    }
}

export const saveQuote = async (quote: QuoteData) => {
  const data = await apiCallPost(`saveQuote`, { quote });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data
  }
}

export const barcodeScan = async (barcode: string, quoteId: string, newQty: number) => {
  const data = await apiCallPost('productScan', { barcode, quoteId, newQty });
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data
  }
}