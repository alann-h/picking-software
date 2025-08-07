// src/utils/useUserStatus.ts
import { useState, useEffect } from 'react';
import { getUserStatus } from '../api/user';
import { useSnackbarContext } from '../components/SnackbarContext';

interface UserStatus {
  isAdmin: boolean;
  userCompanyId: string | null;
  isLoadingStatus: boolean;
}

export const useUserStatus = (skipFetch: boolean): UserStatus => {
  const [status, setStatus] = useState<UserStatus>({
    isAdmin: false,
    userCompanyId: null,
    isLoadingStatus: true,
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
            isLoadingStatus: false,
          });
        } else {
          setStatus(prev => ({ ...prev, isLoadingStatus: false }));
        }
      } catch (err) {
        handleOpenSnackbar((err as Error).message, 'error');
        setStatus({ isAdmin: false, userCompanyId: null, isLoadingStatus: false });
      }
    };

    fetchUserStatus();
  }, [skipFetch, handleOpenSnackbar]);

  return status;
};