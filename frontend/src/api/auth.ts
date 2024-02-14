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

export const callback= async (url: string) => {
  const token = await apiCallGet(url);
  if (token.error) {
    throw new Error(token.error);
  } else {
    return token
  }
}
