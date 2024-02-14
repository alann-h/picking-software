export const isLoggedIn = () => localStorage.getItem('token') !== null;
export const getToken = () => localStorage.getItem('token');
export const setToken = (token: string) => localStorage.setItem('token', token);
export const deleteToken = () => localStorage.removeItem('token');