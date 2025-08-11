// src/utils/useUserStatus.ts
import { useQuery } from '@tanstack/react-query';
import { getUserStatus } from '../api/user';
import { UserStatusResponse } from './types';

export const useUserStatus = () => {
  const { 
    data, 
    isLoading: isLoadingStatus, 
    isError,
  } = useQuery<UserStatusResponse>({
    queryKey: ['userStatus'], 
    
    queryFn: getUserStatus,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    userCompanyId: data?.companyId ?? null,
    isLoadingStatus,
    isError,
  };
};