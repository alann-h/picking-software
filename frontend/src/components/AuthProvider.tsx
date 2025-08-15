// src/api/auth.ts

import React, { createContext, ReactNode } from 'react';
import { useUserStatus } from '../utils/useUserStatus';

interface AuthContextType {
  isAdmin: boolean;
  userCompanyId: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin, userCompanyId, isLoadingStatus, userName, userEmail } = useUserStatus();

  const value: AuthContextType = {
    isAdmin,
    userCompanyId,
    userName,
    userEmail,
    isAuthenticated: !!userCompanyId,
    isLoading: isLoadingStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
