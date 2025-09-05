import { apiCallGet, apiCallPost, apiCallDelete } from '../utils/apiHelpers';
import { AUTH_BASE, VERIFY_USER } from './config';

/**
 * Login user with credentials (for non admin users)
 */
export const loginWithCredentials = async (email: string, password: string, rememberMe: boolean = false) => {
  const data = await apiCallPost(`${AUTH_BASE}/login`, { email, password, rememberMe });
  return data;
};

/**
 * Verifies user
 */
export const verifyUser = async () => {
  const response = await apiCallGet(VERIFY_USER);
  return response;
};

/**
 * Logout user from current session
 */
export const logout = async () => {
  const response = await apiCallPost(`${AUTH_BASE}/logout`, {});
  return response;
};

/**
 * Logout user from all devices/sessions
 */
export const logoutAllDevices = async () => {
  const response = await apiCallPost('logout-all', {});
  return response;
};

/**
 * Get active sessions for current user
 */
export const getUserSessions = async () => {
  const response = await apiCallGet('sessions');
  return response;
};

/**
 * Get enhanced sessions with JSONB filtering capabilities
 */
export const getEnhancedSessions = async (filters?: { 
  includeExpired?: boolean; 
  adminOnly?: boolean; 
}) => {
  const params = new URLSearchParams();
  if (filters?.includeExpired) params.append('includeExpired', 'true');
  if (filters?.adminOnly) params.append('adminOnly', 'true');
  
  const queryString = params.toString();
  const url = queryString ? `sessions/enhanced?${queryString}` : 'sessions/enhanced';
  
  const response = await apiCallGet(url);
  return response;
};

/**
 * Get security monitoring statistics (admin only)
 */
export const getSecurityStats = async () => {
  const response = await apiCallGet('security/monitoring');
  return response;
};

/**
 * Disconnect from QuickBooks
 */
export const disconnectQB = async() => {
  const response = await apiCallDelete(`${AUTH_BASE}/disconnect`);
  return response;
}

/**
 * Request password reset
 */
export const requestPasswordReset = async (email: string) => {
  const response = await apiCallPost(`${AUTH_BASE}/forgot-password`, { email });
  return response;
};

/**
 * Reset password with token
 */
export const resetPassword = async (token: string, password: string) => {
  const response = await apiCallPost(`${AUTH_BASE}/reset-password`, { token, password });
  return response;
};
