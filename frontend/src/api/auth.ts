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
 * Gets tokens
 */
export const retrieveToken= async (userId: string) => {
  const token = await apiCallGet(`retrieveToken/${userId}`);
  if (token.error) {
    throw new Error(token.error);
  } else {
    return token;
  }
};
/**
 * Verifies user
 */
export const verifyUser = async (userId: string) => {
  const response = await apiCallGet(`verifyUser/${userId}`);
  if (response.error) {
    throw new Error(response.error);
  } else {
    return response;
  }
};

