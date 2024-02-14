import config from '../config.json';
import { isLoggedIn, getAccessToken } from './storage';

/**
 * GET request to API
 */
export const apiCallGet = async (path: string) => {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (isLoggedIn()) headers.Authorization = `Bearer ${getAccessToken()}`;

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, {
    method: 'GET',
    headers
  });
  if (!response.ok) {
    console.log(response);
  }
  return await response.json();
};

/**
 * POST request to API
 */
export const apiCallPost = async (path: string, body: object) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    accept: 'application/json'
  };
  if (isLoggedIn()) headers.Authorization = `Bearer ${getAccessToken()}`;

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    console.log(response);
  }
  return await response.json();
};

/**
 * PUT request to API
 */
export const apiCallPut = async (path: string, body: object) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    accept: 'application/json'
  };
  if (isLoggedIn()) headers.Authorization = `Bearer ${getAccessToken()}`;

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    console.log(response);
  }
  return await response.json();
};

/**
 * DELETE request to API
 */
export const apiCallDelete = async (path: string) => {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (isLoggedIn()) headers.Authorization = `Bearer ${getAccessToken()}`;

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) {
    console.log(response);
  }
  return await response.json();
};
