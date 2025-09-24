// src/utils/useUserStatus.ts
import { useQuery } from '@tanstack/react-query';
import { getUserStatus } from '../api/user';
import { UserStatusResponse } from './types';

export const useUserStatus = () => {
  const { 
    data, 
    isLoading: isLoadingStatus, 
    isError,
    error,
  } = useQuery<UserStatusResponse>({
    queryKey: ['userStatus'], 
    
    queryFn: getUserStatus as () => Promise<UserStatusResponse>,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (authentication failures)
      if (error?.response?.status === 401) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });

  // If we get a 401 error, treat as not authenticated
  const isAuthError = (error as any)?.response?.status === 401;
  
  return {
    isAdmin: isAuthError ? false : (data?.isAdmin ?? false),
    userId: isAuthError ? null : (data?.userId ?? null),
    userCompanyId: isAuthError ? null : (data?.companyId ?? null),
    userName: isAuthError ? null : (data?.name ?? null),
    userEmail: isAuthError ? null : (data?.email ?? null),
    connectionType: isAuthError ? 'none' : (data?.connectionType ?? 'none'),
    isLoadingStatus: isLoadingStatus && !isAuthError,
    isError: isError && !isAuthError,
  };
};