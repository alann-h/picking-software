import Cookies from 'js-cookie';

export const isLoggedIn = () => Cookies.get('accessToken') !== undefined;
export const getAccessToken = () => Cookies.get('accessToken');
export const getUserId = () => Cookies.get('userId');
export const setUserId = (userId: string) => Cookies.set('userId', userId, { expires: 7, secure: true, sameSite: 'strict' });
export const setToken = (token: string) => Cookies.set('accessToken', token, { expires: 7, secure: true, sameSite: 'strict' });
export const deleteToken = () => {Cookies.remove('accessToken'); Cookies.remove('userId'); };
