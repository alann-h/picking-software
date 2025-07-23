import { apiCallGet, apiCallPost } from "~/utils/apiHelper";
/**
 * Verifies user - now takes the Remix request.
 */
export const verifyUser = async (request: Request) => {
  const response = await apiCallGet('verifyUser', request);
  return response;
};

export const loginWithCredentials = async (email: string, password: string, request: Request) => {
  const data = await apiCallPost('auth/login', { email, password }, request);
  return data;
};
