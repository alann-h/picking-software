import React from 'react';
import { extractQuote, savePickerNote } from '../api/quote';

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

export const handleSaveNote = async (quoteId: number, note: string) => {
  const response = await savePickerNote(quoteId, note);
  return response;
}