import { CSRF_TOKEN, API_BASE } from '../api/config';

// Type definitions for better TypeScript support
type RequestInit = globalThis.RequestInit;

// --- CSRF Token Management ---
let cachedCsrfToken: string | null;



/**
 * Fetches the CSRF token from the backend and caches it.
 * This should ideally be called once at application startup or after login.
 * @returns The fetched CSRF token.
 * @throws Error if fetching the token fails.
 */
export const fetchAndCacheCsrfToken = async (): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/${CSRF_TOKEN}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.csrfToken) {
            throw new Error("CSRF token not found in response.");
        }
        cachedCsrfToken = data.csrfToken;
        return data.csrfToken
    } catch (error) {
        console.error("Error fetching CSRF token:", error);
        throw error;
    }
};

/**
 * Clear the cached CSRF token. Useful after logout or when CSRF errors occur.
 */
export const clearCachedCsrfToken = (): void => {
    cachedCsrfToken = null;
};

export class HttpError extends Error {
  response: {
    data: unknown;
    status: number;
  };

  constructor(response: Response, data: unknown) {
    // Extract message from backend error structure: { error: { message: "...", code: "..." } }
    let message = `HTTP error! status: ${response.status}`;
    
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, unknown>;
      
      // Try to get message from error.message first
      if ('error' in dataObj && dataObj.error && typeof dataObj.error === 'object') {
        const errorData = dataObj.error as Record<string, unknown>;
        if ('message' in errorData) {
          message = String(errorData.message);
        }
      }
      // Try direct message property
      else if ('message' in dataObj) {
        message = String(dataObj.message);
      }
      // Try direct error property
      else if ('error' in dataObj) {
        message = String(dataObj.error);
      }
    }
    
    super(message);
    
    this.name = 'HttpError';
    this.response = {
      data,
      status: response.status,
    };
  }
}

/**
 * Extracts a user-friendly error message from various error types
 * @param error - The error object to extract message from
 * @param fallback - Fallback message if extraction fails
 * @returns A string error message
 */
export const extractErrorMessage = (error: unknown, fallback: string = 'An error occurred'): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    
    // Handle backend error structure: { error: { message: "...", code: "..." } }
    if ('error' in errorObj && errorObj.error && typeof errorObj.error === 'object') {
      const errorData = errorObj.error as Record<string, unknown>;
      if ('message' in errorData) {
        return String(errorData.message);
      }
    }
    
    // Handle direct error object with message property
    if ('message' in errorObj) {
      return String(errorObj.message);
    }
    
    // Handle HttpError response data
    if ('response' in errorObj && errorObj.response && typeof errorObj.response === 'object') {
      const responseObj = errorObj.response as Record<string, unknown>;
      if ('data' in responseObj && responseObj.data && typeof responseObj.data === 'object') {
        const responseData = responseObj.data as Record<string, unknown>;
        if ('error' in responseData && responseData.error && typeof responseData.error === 'object') {
          const errorData = responseData.error as Record<string, unknown>;
          if ('message' in errorData) {
            return String(errorData.message);
          }
        }
        if ('message' in responseData) {
          return String(responseData.message);
        }
      }
    }
    
    // Last resort: try to stringify the object
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  
  return fallback;
};

/**
 * Returns common headers for API requests, including the CSRF token if available
 * and the method requires it.
 * @param method The HTTP method (e.g., 'POST', 'GET').
 * @returns An object containing common headers.
 */
const getCommonHeaders = async (method: string): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
    };

    if (['POST', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
        if (!cachedCsrfToken) {
            await fetchAndCacheCsrfToken();
        }
        if (cachedCsrfToken) {
            headers['x-csrf-token'] = cachedCsrfToken;
        } else {
            console.error("CSRF token not available for state-changing request.");
            throw new Error("CSRF token not available.");
        }
    }
    return headers;
};

/**
 * Handles API responses, including error parsing and CSRF token refresh logic.
 * @param response The Fetch API Response object.
 * @param originalRequestCallback An optional function to re-attempt the original request
 * after a token refresh (useful for robust retry logic).
 * @returns The parsed JSON data from the response.
 * @throws Error if the response is not OK or if a specific CSRF error occurs.
 */
export const handleResponse = async (response: Response): Promise<unknown> => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const errorMessage = (typeof errorData.error === 'string' ? errorData.error : errorData.message || '').toLowerCase();
    
    // Handle CSRF token errors
    if (response.status === 403 && (errorMessage.includes('csrf') || errorMessage.includes('token'))) {
      console.warn("CSRF token error detected. Invalidating cached token.");
      console.error("Error details:", errorData);
      // Clear the cached CSRF token so it gets refetched on next request
      cachedCsrfToken = null;
      const csrfError = new HttpError(response, errorData);
      csrfError.name = 'CsrfError';
      throw csrfError;
    }

    // Handle rate limit errors with a more helpful message
    if (response.status === 429) {
      console.warn("Rate limit exceeded. Please wait a moment before making more requests.");
      const rateLimitError = new HttpError(response, {
        ...errorData,
        message: 'Too many requests. Please wait a moment and try again.',
        error: 'RATE_LIMIT_EXCEEDED'
      });
      rateLimitError.name = 'RateLimitError';
      throw rateLimitError;
    }

    // For all other errors, throw the generic HttpError
    throw new HttpError(response, errorData);
  }
  
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return {}; // Return empty object for non-json responses or no content
};

// --- API Call Functions ---

export const apiCallGet = async (path: string) => {
    const headers = await getCommonHeaders('GET');
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}/${path}`, {
        method: 'GET',
        headers,
        credentials: 'include',
    });

    return handleResponse(response);
};

export const apiCallPost = async (path: string, body: object | FormData) => {
    const headers = await getCommonHeaders('POST');
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

export const apiCallPut = async (path: string, body: object) => {
    const headers = await getCommonHeaders('PUT');
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE}/${path}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(body)
    });

    return handleResponse(response);
};

export const apiCallDelete = async (path: string) => {
    const headers = await getCommonHeaders('DELETE');

    const response = await fetch(`${API_BASE}/${path}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
    });

    return handleResponse(response);
};