import { apiCallDelete, apiCallGet, apiCallPost } from '../utils/apiHelpers';

export const getAllUsers = async () => {
    const data = await apiCallGet('getAllUsers');
    if (data.error) {
      throw new Error(data.error);
    } else {
      return data;
    }
};

export const registerUser = async (email: string, firstName: string, lastName: string, password: string, isAdmin: boolean) => {
    const data = await apiCallPost('register', { email, firstName, lastName, password, isAdmin });
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
