import { useContext } from 'react';
import { AuthContext } from '../components/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Convenience hooks for common permission checks
export const usePermissions = () => {
  const { permissions, hasPermission, hasAccessLevel, canAccessService } = useAuth();
  return { permissions, hasPermission, hasAccessLevel, canAccessService };
};

export const useAdminFunctions = () => {
  const { 
    updateUserPermissions, 
    getCompanyUserPermissions, 
    getAuditLogs,
    getConnectionHealth,
    hasAccessLevel 
  } = useAuth();
  
  return { 
    updateUserPermissions, 
    getCompanyUserPermissions, 
    getAuditLogs,
    getConnectionHealth,
    isAdmin: hasAccessLevel('admin')
  };
};