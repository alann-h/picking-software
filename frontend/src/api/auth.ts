import { apiCallGet } from '../utils/apiHelpers';

/**
 * Login user
 */
export const login = async () => {
  const data = await apiCallGet('authUri');
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data
  }
}
/**
 * Gets tokens
 */
export const retrieveToken= async () => {
  const token = await apiCallGet('retrieveToken');
  if (token.error) {
    throw new Error(token.error);
  } else {
    return token
  }
}