import { apiCallPost } from '../utils/apiHelpers';

export const extractQuote = async (searchField: string, estimateNumber: string) => {
    const data = await apiCallPost(`estimates`, { searchField, estimateNumber });
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data
    }
}