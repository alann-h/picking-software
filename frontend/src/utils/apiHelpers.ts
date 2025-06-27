import { API_BASE } from '../api/config';
/**
 * Get CSRF token
 */
const getCsrfToken = async () => {
  const response = await fetch(`${API_BASE}/csrf-token`, {
    credentials: 'include'
  });
  const data = await response.json();
  return data.csrfToken;
};

// Common headers and options used across all requests
const getCommonHeaders = async (): Promise<Record<string, string>> => {
  const csrfToken = await getCsrfToken();
  return {
    'accept': 'application/json',
    'x-csrf-token': csrfToken
  };
};

const handleResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      (typeof data.error === "string" && data.error) ||
      `HTTP error! status: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
};

export const apiCallGet = async (path: string) => {
  const headers = await getCommonHeaders();
  headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  return handleResponse(response);
};

/**
 * POST request to API
 */
export const apiCallPost = async (path: string, body: object | FormData) => {
  const headers = await getCommonHeaders();
  const options: RequestInit = {
    method: 'POST',
    headers,
    credentials: 'include',
    body: body instanceof FormData ? body : JSON.stringify(body)
  };

  // Only set Content-Type for JSON bodies
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/${path}`, options);
  return handleResponse(response);
};

/**
 * PUT request to API
 */
export const apiCallPut = async (path: string, body: object) => {
  const headers = await getCommonHeaders();
  headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(body)
  });

  return handleResponse(response);
};

/**
 * DELETE request to API
 */
export const apiCallDelete = async (path: string) => {
  const headers = await getCommonHeaders();

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  return handleResponse(response);
};
