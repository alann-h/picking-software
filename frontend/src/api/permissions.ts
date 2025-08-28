import { apiCallGet, apiCallPost, apiCallDelete } from '../utils/apiHelpers';

const PERMISSIONS_BASE = 'api/permissions';

// --- Types ---
export interface UserPermissions {
  accessLevel: 'read' | 'write' | 'admin';
}

export interface PermissionUpdateRequest {
  companyId: string;
  permissions: Partial<UserPermissions>;
}

export interface CompanyUserPermission {
  id: string;
  display_email: string;
  given_name: string;
  family_name: string;
  is_admin: boolean;
  access_level: 'read' | 'write' | 'admin';
  permission_created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  company_id: string;
  api_endpoint: string;
  connection_type: string;
  request_method: string;
  response_status: number;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface ConnectionHealth {
  id: string;
  company_id: string;
  connection_type: string;
  status: 'healthy' | 'warning' | 'expired' | 'revoked';
  last_check: string;
  last_successful_call?: string;
  failure_count: number;
  last_error_message?: string;
  next_check_due: string;
  created_at: string;
  updated_at: string;
}

// --- API Functions ---

export const getCompanyUserPermissions = async (companyId: string): Promise<CompanyUserPermission[]> => {
  const url = `${PERMISSIONS_BASE}/company/${companyId}`;
  const response = await apiCallGet(url);
  return response;
};

export const updateUserPermissions = async (request: PermissionUpdateRequest): Promise<any> => {
  const url = `${PERMISSIONS_BASE}/user/${request.companyId}`;
  const response = await apiCallPost(url, request);
  return response;
};

export const revokeUserPermissions = async (userId: string, companyId: string): Promise<any> => {
  const url = `${PERMISSIONS_BASE}/user/${userId}?companyId=${companyId}`;
  const response = await apiCallDelete(url);
  return response;
};

export const getCompanyAuditLogs = async (companyId: string): Promise<AuditLog[]> => {
  const url = `${PERMISSIONS_BASE}/audit/company/${companyId}`;
  const response = await apiCallGet(url);
  return response;
};

export const getConnectionHealth = async (companyId: string): Promise<ConnectionHealth[]> => {
  const url = `${PERMISSIONS_BASE}/connection-health/company/${companyId}`;
  const response = await apiCallGet(url);
  return response;
};

export const getFailedApiCalls = async (companyId: string): Promise<AuditLog[]> => {
  const url = `${PERMISSIONS_BASE}/audit/company/${companyId}/failed`;
  const response = await apiCallGet(url);
  return response;
};

// --- Permission Checking Utilities ---

/**
 * Check if user has specific permission
 */
export const checkUserPermission = async (
  userId: string, 
  companyId: string, 
  permission: keyof UserPermissions
): Promise<boolean> => {
  try {
    const permissions = await getCompanyUserPermissions(companyId);
    const userPermission = permissions.find(p => p.id === userId);
    
    if (!userPermission) return false;
    
    switch (permission) {
      case 'accessLevel':
        return userPermission.access_level === 'admin';
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
};

/**
 * Check if user has required access level
 */
export const checkUserAccessLevel = async (
  userId: string,
  companyId: string,
  requiredLevel: 'read' | 'write' | 'admin'
): Promise<boolean> => {
  try {
    const permissions = await getCompanyUserPermissions(companyId);
    const userPermission = permissions.find(p => p.id === userId);
    
    if (!userPermission) return false;
    
    const levelHierarchy = { 'read': 1, 'write': 2, 'admin': 3 };
    const userLevel = levelHierarchy[userPermission.access_level] || 0;
    const requiredLevelNum = levelHierarchy[requiredLevel] || 0;
    
    return userLevel >= requiredLevelNum;
  } catch (error) {
    console.error('Error checking user access level:', error);
    return false;
  }
};

/**
 * Get current user's permissions for a company
 */
export const getCurrentUserPermissions = async (companyId: string): Promise<UserPermissions | null> => {
  try {
    // This would typically get the current user ID from your auth context
    // For now, we'll need to pass it in or get it from the session
    const response = await apiCallGet(`api/permissions/current-user/${companyId}`);
    return response;
  } catch (error) {
    console.error('Error getting current user permissions:', error);
    return null;
  }
};
