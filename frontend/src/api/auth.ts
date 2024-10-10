import { apiCallGet } from '../utils/apiHelpers';

/**
 * Login user
 */
export const login = async () => {
  const data = await apiCallGet('authUri');
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
};

/**
 * Verifies user
 */
export const verifyUser = async () => {
  const response = await apiCallGet('verifyUser');
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;
  }
};

/**
 * Get CSRF token
 */
export const getCsrfToken = async () => {
  const response = await apiCallGet('csrf-token');
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response.csrfToken;
  }
};