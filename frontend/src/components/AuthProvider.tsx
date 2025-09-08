// src/api/auth.ts

import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { useUserStatus } from '../utils/useUserStatus';
import { 
  getCompanyUserPermissions, 
  updateUserPermissions, 
  getCompanyAuditLogs, 
  getConnectionHealth,
  UserPermissions 
} from '../api/permissions';

interface AuthContextType {
  // Existing fields
  isAdmin: boolean;
  userCompanyId: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // New permission fields
  permissions: UserPermissions | null;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  hasAccessLevel: (requiredLevel: 'read' | 'write' | 'admin') => boolean;
  canAccessService: (service: 'qbo' | 'xero') => boolean;
  
  // Permission management (admin only)
  updateUserPermissions: (userId: string, permissions: Partial<UserPermissions>) => Promise<void>;
  getCompanyUserPermissions: () => Promise<any[]>;
  getAuditLogs: () => Promise<any[]>;
  getConnectionHealth: () => Promise<any[]>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin, userCompanyId, isLoadingStatus, userName, userEmail } = useUserStatus();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Load user permissions when authenticated
  useEffect(() => {
    if (userCompanyId && !permissions) {
      loadUserPermissions();
    }
  }, [userCompanyId, permissions]);

  const loadUserPermissions = async () => {
    if (!userCompanyId) return;
    
    try {
      setPermissionsLoading(true);
      const response = await getCompanyUserPermissions(userCompanyId);
      
      // Find current user's permissions by email (since userCompanyId is actually the company ID)
      const currentUserPermissions = response.find(
        (user: any) => user.display_email === userEmail
      );
      
      if (currentUserPermissions) {
        setPermissions({
          accessLevel: currentUserPermissions.access_level as 'read' | 'write' | 'admin',
        });
      }
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      // Set default permissions based on admin status
      setPermissions({
        accessLevel: isAdmin ? 'admin' : 'read',
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Permission checking functions
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (permission === 'accessLevel') return false;
    return permissions?.[permission] || false;
  };

  const hasAccessLevel = (requiredLevel: 'read' | 'write' | 'admin'): boolean => {
    if (!permissions) {
      return false;
    }
    
    const levelHierarchy = { 'read': 1, 'write': 2, 'admin': 3 };
    const userLevel = levelHierarchy[permissions.accessLevel] || 0;
    const requiredLevelNum = levelHierarchy[requiredLevel] || 0;
    
    return userLevel >= requiredLevelNum;
  };

  const canAccessService = (_service: 'qbo' | 'xero'): boolean => {
    // All users can access QBO/Xero services since they're essential for the picking software
    return true;
  };

  // Admin functions
  const updateUserPermissionsLocal = async (userId: string, newPermissions: Partial<UserPermissions>) => {
    if (!userCompanyId || !hasAccessLevel('admin')) {
      throw new Error('Insufficient permissions');
    }

    await updateUserPermissions({
      companyId: userCompanyId,
      permissions: newPermissions
    });

    // Reload permissions if updating current user
    if (userId === userCompanyId) {
      await loadUserPermissions();
    }
  };

  const getCompanyUserPermissionsLocal = async () => {
    if (!userCompanyId) {
      throw new Error('No company ID available');
    }
    
    if (!hasAccessLevel('admin')) {
      throw new Error('Insufficient permissions - admin level required');
    }

    const response = await getCompanyUserPermissions(userCompanyId);
    return response;
  };

  const getAuditLogs = async () => {
    if (!userCompanyId || !hasAccessLevel('admin')) {
      throw new Error('Insufficient permissions');
    }

    const response = await getCompanyAuditLogs(userCompanyId);
    return response;
  };

  const getConnectionHealthLocal = async () => {
    if (!userCompanyId || !hasAccessLevel('read')) {
      throw new Error('Insufficient permissions');
    }

    const response = await getConnectionHealth(userCompanyId);
    return response;
  };

  const value: AuthContextType = {
    // Existing fields
    isAdmin,
    userCompanyId,
    userName,
    userEmail,
    isAuthenticated: !!userCompanyId,
    isLoading: isLoadingStatus || permissionsLoading,
    
    // New permission fields
    permissions,
    hasPermission,
    hasAccessLevel,
    canAccessService,
    
    // Admin functions
    updateUserPermissions: updateUserPermissionsLocal,
    getCompanyUserPermissions: getCompanyUserPermissionsLocal,
    getAuditLogs,
    getConnectionHealth: getConnectionHealthLocal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
