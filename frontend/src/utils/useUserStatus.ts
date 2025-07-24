// src/utils/useUserStatus.ts
import { useState, useEffect } from 'react';
import { getUserStatus } from '../api/user';
import { useSnackbarContext } from '../components/SnackbarContext';

interface UserStatus {
  isAdmin: boolean;
  userCompanyId: string | null;
  isLoading: boolean;
}

export const useUserStatus = (skipFetch: boolean): UserStatus => {
  const [status, setStatus] = useState<UserStatus>({
    isAdmin: false,
    userCompanyId: null,
    isLoading: true,
  });
  const { handleOpenSnackbar } = useSnackbarContext();

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        if (!skipFetch) {
          const userStatus = await getUserStatus();
          setStatus({
            isAdmin: userStatus.isAdmin,
            userCompanyId: userStatus.companyId || null,
            isLoading: false,
          });
        } else {
          setStatus(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        handleOpenSnackbar((err as Error).message, 'error');
        setStatus({ isAdmin: false, userCompanyId: null, isLoading: false });
      }
    };

    fetchUserStatus();
  }, [skipFetch, handleOpenSnackbar]);

  return status;
};