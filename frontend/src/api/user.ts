import { apiCallDelete, apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';
import { UserUpdateData } from '../utils/types';
import { AUTH_BASE, USER_STATUS } from './config';

export const getAllUsers = async () => {
    const data = await apiCallGet(`${AUTH_BASE}/users`);
    return data;
};

export const registerUser = async (email: string, givenName: string, familyName: string, password: string, isAdmin: boolean) => {
    const data = await apiCallPost(`${AUTH_BASE}/register`, { email, givenName, familyName, password, isAdmin });
    return data;
}

export const deleteUser = async (userId: string) => {
  const data = await apiCallDelete(`${AUTH_BASE}/delete/${userId}`);
  return data;
}

export const updateUser = async (userId: string, updateData: UserUpdateData) => {
  const data = await apiCallPut(`${AUTH_BASE}/update/${userId}`, updateData);
  return data;
};

export const getUserStatus = async() => {
  const data = await apiCallGet(USER_STATUS);
  return data;
}
