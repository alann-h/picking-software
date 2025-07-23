// app/utils/apiHelpers.ts
import { API_BASE } from '~/config/api'; // Adjust path if config is elsewhere

/**
 * Get CSRF token.
 * In a Remix loader/action, this function runs on the server.
 * If your Express backend sends the CSRF token as a cookie, you should access it
 * from the `request.headers.get("Cookie")` directly and not make a new fetch.
 * For now, assuming your Express backend serves this endpoint for a token.
 *
 * @param {Request} request The Remix request object, useful for forwarding cookies.
 */
const getCsrfToken = async (request: Request) => {
  // Forward cookies from the client request to the CSRF token request
  const response = await fetch(`${API_BASE}/csrf-token`, {
    credentials: 'include', // Important to include cookies for session-based CSRF
    headers: request.headers, // Forwarding client cookies
  });
  const data = await response.json();
  return data.csrfToken;
};

// Common headers and options used across all requests
// We now pass the original Remix request to get access to client cookies.
const getCommonHeaders = async (request: Request): Promise<Record<string, string>> => {
  const csrfToken = await getCsrfToken(request);
  return {
    'accept': 'application/json',
    'x-csrf-token': csrfToken,
    // This is crucial for session-based authentication with your Express backend.
    'Cookie': request.headers.get("Cookie") || '',
  };
};

const handleResponse = async (response: Response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg =
      (typeof data.error === "string" && data.error) ||
      `HTTP error! status: ${response.status} - ${JSON.stringify(data)}`;
    throw new Error(errorMsg);
  }

  return data;
};

export const apiCallGet = async (path: string, request: Request) => {
  const headers = await getCommonHeaders(request);
  headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  return handleResponse(response);
};

export const apiCallPost = async (path: string, body: object | FormData, request: Request) => {
  const headers = await getCommonHeaders(request);
  const options: RequestInit = {
    method: 'POST',
    headers,
    credentials: 'include',
    body: body instanceof FormData ? body : JSON.stringify(body)
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/${path}`, options);
  return handleResponse(response);
};

export const apiCallPut = async (path: string, body: object, request: Request) => {
  const headers = await getCommonHeaders(request);
  headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(body)
  });

  return handleResponse(response);
};

export const apiCallDelete = async (path: string, request: Request) => {
  const headers = await getCommonHeaders(request);

  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  return handleResponse(response);
};
