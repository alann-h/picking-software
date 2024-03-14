export const isLoggedIn = () => localStorage.getItem('accessToken') !== null;
export const getAccessToken = () => localStorage.getItem('accessToken');
export const getUserId = () => localStorage.getItem('userId');
export const setUserId = (userId: string) => localStorage.setItem('userId', userId);
export const setToken = (token: string) => localStorage.setItem('accessToken', token);
export const deleteToken = () => localStorage.removeItem('accessToken');