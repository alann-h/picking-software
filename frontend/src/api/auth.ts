import { apiCallGet, apiCallPost } from '../utils/apiHelpers';

/**
 * Login user with Quickbooks login (only admin should do this)
 */
export const loginWithQb = async () => {
  const data = await apiCallGet('authUri');
  if (data.error) {
    throw new Error(data.error);
  } else {
    console.log(data);
    return data;
  }
};

/**
 * Login user with credentials (for non admin users)
 */
export const loginWithCredentials = async (email: string, password: string) => {
  const data = await apiCallPost('login', { email, password });
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
