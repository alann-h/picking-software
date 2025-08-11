// src/api/auth.ts

import React, { createContext, useContext, ReactNode } from 'react';
import { useUserStatus } from '../utils/useUserStatus';
import LogoLoader from './LogoLoader';

interface AuthContextType {
  isAdmin: boolean;
  userCompanyId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin, userCompanyId, isLoadingStatus } = useUserStatus();

  const value: AuthContextType = {
    isAdmin,
    userCompanyId,
    isAuthenticated: !!userCompanyId,
    isLoading: isLoadingStatus,
  };

  if (value.isLoading) {
    return <LogoLoader />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create the custom hook that components will use to access the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};