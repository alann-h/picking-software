import { useState, useEffect } from 'react';
import { getUserStatus } from '../api/user';
import { useSnackbarContext } from '../components/SnackbarContext';

export const useUserStatus = (skipFetch: boolean) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        if (!skipFetch) {
          const userStatus = await getUserStatus();
          setIsAdmin(userStatus.isAdmin);
        }
      } catch (err) {
        handleOpenSnackbar((err as Error).message, 'error');
      }
    };

    fetchUserStatus();
  }, [skipFetch, handleOpenSnackbar]);

  return { isAdmin };
};
