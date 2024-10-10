import config from '../config.json';
import { getCsrfToken } from '../api/auth';

/**
 * GET request to API
 */
export const apiCallGet = async (path: string) => {
  const headers: Record<string, string> = { 
    'accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, {
    method: 'GET',
    headers,
    credentials: 'include', // This is important for including cookies in the request
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * POST request to API
 */
export const apiCallPost = async (path: string, body: object | FormData) => {
  const csrfToken = await getCsrfToken();

  const headers: Record<string, string> = {
    'accept': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  const options: RequestInit = {
    method: 'POST',
    headers,
    credentials: 'include', // This is important for including cookies in the request
    body: body instanceof FormData ? body : JSON.stringify(body)
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * PUT request to API
 */
export const apiCallPut = async (path: string, body: object) => {
  const csrfToken = await getCsrfToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'accept': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, {
    method: 'PUT',
    headers,
    credentials: 'include', // This is important for including cookies in the request
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * DELETE request to API
 */
export const apiCallDelete = async (path: string) => {
  const csrfToken = await getCsrfToken();

  const headers: Record<string, string> = { 
    'accept': 'application/json',
    'X-CSRF-Token': csrfToken,
  };

  const response = await fetch(`http://localhost:${config.BACKEND_PORT}/${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'include', // This is important for including cookies in the request
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};