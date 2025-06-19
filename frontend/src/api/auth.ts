import { apiCallGet, apiCallPost, apiCallDelete } from '../utils/apiHelpers';

/**
 * Login user with credentials (for non admin users)
 */
export const loginWithCredentials = async (email: string, password: string) => {
  const data = await apiCallPost('auth/login', { email, password });
  return data;
};

/**
 * Verifies user
 */
export const verifyUser = async () => {
  const response = await apiCallGet('verifyUser');
  return response;
};

export const disconnectQB = async() => {
  const response = await apiCallDelete('auth/disconnect');
  return response;
}
