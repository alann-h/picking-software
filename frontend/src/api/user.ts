import { apiCallDelete, apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';

export const getAllUsers = async () => {
    const data = await apiCallGet('auth/users');
    return data;
};

export const registerUser = async (email: string, givenName: string, familyName: string, password: string, isAdmin: boolean) => {
    const data = await apiCallPost('auth/register', { email, givenName, familyName, password, isAdmin });
    return data;
}

export const deleteUser = async (userId: string) => {
  const data = await apiCallDelete(`auth/delete/${userId}`);
  return data;
}

export const updateUser = async(userId: string, email: string, password: string, givenName:string, familyName: string, isAdmin: boolean) => {
  const data = await apiCallPut(`auth/update/${userId}`, {email, givenName, familyName, password, isAdmin});
  return data;
}

export const getUserStatus = async() => {
  const data = await apiCallGet('user-status');
  return data;
}
