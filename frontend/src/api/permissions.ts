import { apiCallGet, apiCallPost, apiCallDelete } from '../utils/apiHelpers';

// --- Types ---
export interface UserPermissions {
  canAccessQBO: boolean;
  canAccessXero: boolean;
  canRefreshTokens: boolean;
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
  can_access_qbo: boolean;
  can_access_xero: boolean;
  can_refresh_tokens: boolean;
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
  ip_address: string;
  user_agent: string;
  timestamp: string;
  display_email?: string;
  given_name?: string;
  family_name?: string;
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
}

// --- Company User Permissions ---

/**
 * Get all users and their permissions for a company
 */
export const getCompanyUserPermissions = async (companyId: string): Promise<CompanyUserPermission[]> => {
  
  try {
    const response = await apiCallGet(`permissions/company/${companyId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user permissions for a company
 */
export const updateUserPermissions = async (userId: string, request: PermissionUpdateRequest): Promise<any> => {
  const response = await apiCallPost(`permissions/user/${userId}`, request);
  return response;
};

/**
 * Revoke all permissions for a user in a company
 */
export const revokeUserPermissions = async (userId: string, companyId: string): Promise<any> => {
  const response = await apiCallDelete(`permissions/user/${userId}`);
  return response;
};

// --- Audit and Monitoring ---

/**
 * Get company audit logs with optional filtering
 */
export const getCompanyAuditLogs = async (
  companyId: string, 
  limit: number = 100, 
  offset: number = 0
): Promise<AuditLog[]> => {
  const params = new URLSearchParams();
  if (limit !== 100) params.append('limit', limit.toString());
  if (offset !== 0) params.append('offset', offset.toString());
  
  const queryString = params.toString();
  const url = queryString ? `permissions/audit/${companyId}?${queryString}` : `permissions/audit/${companyId}`;
  
  const response = await apiCallGet(url);
  return response;
};

/**
 * Get user-specific audit logs
 */
export const getUserAuditLogs = async (
  userId: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<AuditLog[]> => {
  const params = new URLSearchParams();
  if (limit !== 50) params.append('limit', limit.toString());
  if (offset !== 0) params.append('offset', offset.toString());
  
  const queryString = params.toString();
  const url = queryString ? `permissions/user-audit/${userId}?${queryString}` : `permissions/user-audit/${userId}`;
  
  const response = await apiCallGet(url);
  return response;
};

/**
 * Get connection health for a company
 */
export const getConnectionHealth = async (companyId: string): Promise<ConnectionHealth[]> => {
  const response = await apiCallGet(`permissions/health/${companyId}`);
  return response;
};

/**
 * Get failed API calls for monitoring (last 24 hours by default)
 */
export const getFailedApiCalls = async (companyId: string, hours: number = 24): Promise<AuditLog[]> => {
  const params = new URLSearchParams();
  if (hours !== 24) params.append('hours', hours.toString());
  
  const queryString = params.toString();
  const url = queryString ? `permissions/failed-calls/${companyId}?${queryString}` : `permissions/failed-calls/${companyId}`;
  
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
      case 'canAccessQBO':
        return userPermission.can_access_qbo;
      case 'canAccessXero':
        return userPermission.can_access_xero;
      case 'canRefreshTokens':
        return userPermission.can_refresh_tokens;
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
    const userLevel = levelHierarchy[userPermission.access_level];
    const requiredLevelNum = levelHierarchy[requiredLevel];
    
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
    const response = await apiCallGet(`permissions/current-user/${companyId}`);
    return response;
  } catch (error) {
    console.error('Error getting current user permissions:', error);
    return null;
  }
};
