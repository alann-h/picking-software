import { useState, useEffect, useCallback } from 'react';
import { getAllProducts } from '../api/others';
import { Product } from '../utils/types';
import { useSnackbarContext } from '../components/SnackbarContext';

export const useAllProducts = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { handleOpenSnackbar } = useSnackbarContext();

  const fetchAllProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const products = await getAllProducts();
      setAllProducts(products);
    } catch (err) {
      handleOpenSnackbar((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [handleOpenSnackbar]);

  useEffect(() => {
    fetchAllProducts();
  }, [fetchAllProducts]);

  return { allProducts, isLoading, refetch: fetchAllProducts };
};