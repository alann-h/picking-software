import { apiCallPost } from '../utils/apiHelpers';
import { getUserId } from '../utils/storage';

export const extractQuote = async (searchField: string, estimateNumber: string) => {
    const userId = getUserId();
    const data = await apiCallPost(`estimates`, { searchField, estimateNumber, userId });
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data
    }
}