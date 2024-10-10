import { extractQuote } from '../api/quote';


export const createFetchQuoteData = async (
  quoteId: number,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    setIsLoading(true);
    try {
      const response = await extractQuote(quoteId);
      return response;
    } finally {
      setIsLoading(false);
    }
};

