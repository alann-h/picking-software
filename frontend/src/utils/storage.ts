export const isLoggedIn = () => localStorage.getItem('refreshToken') !== null;
export const getAccessToken = () => localStorage.getItem('accessToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setToken = (name: string, token: string) => localStorage.setItem(name, token);
export const deleteToken = (tokenName: string) => localStorage.removeItem(tokenName);