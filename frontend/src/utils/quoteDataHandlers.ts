import { QuoteData } from '../utils/types';
import { extractQuote, saveQuote } from '../api/quote';

export const createSaveQuoteWithDelay = async (
  saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  isSavingRef: React.MutableRefObject<boolean>,
  data: QuoteData | null
) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        await saveQuote(data);
      } finally {
        isSavingRef.current = false;
      }
    }, 1000);  // 1 second delay
};

export const createFetchQuoteData = async (
  quoteId: number,
  setQuoteData: React.Dispatch<React.SetStateAction<QuoteData | null>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    setIsLoading(true);
    try {
      const response = await extractQuote(quoteId);
      setQuoteData(response.data);
      return response;
    } finally {
      setIsLoading(false);
    }
};

export const createUpdateQuoteData = (
  setQuoteData: React.Dispatch<React.SetStateAction<QuoteData | null>>
) => {
  return (updater: (prevQuoteData: QuoteData) => Partial<QuoteData>) => {
    setQuoteData(prevQuoteData => {
      if (!prevQuoteData) return null;
      const updates = updater(prevQuoteData);
      return {
        ...prevQuoteData,
        ...updates,
        productInfo: updates.productInfo || prevQuoteData.productInfo
      };
    });
  };
};
