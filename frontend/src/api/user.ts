import { apiCallDelete, apiCallGet, apiCallPost, apiCallPut } from '../utils/apiHelpers';

export const getAllUsers = async () => {
    const data = await apiCallGet('getAllUsers');
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data;
    }
};

export const registerUser = async (email: string, givenName: string, familyName: string, password: string, isAdmin: boolean) => {
    const data = await apiCallPost('register', { email, givenName, familyName, password, isAdmin });
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data;
    }
}

export const deleteUser = async (userId: string) => {
  const data = await apiCallDelete(`deleteUser/${userId}`);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}

export const updateUser = async(userId: string, email: string, password: string, givenName:string, familyName: string, isAdmin: boolean) => {
  const data = await apiCallPut(`updateUser/${userId}`, {email, givenName, familyName, password, isAdmin});
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}

export const getUserStatus = async() => {
  const data = await apiCallGet('user-status');
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}
