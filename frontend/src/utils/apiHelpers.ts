import { API_BASE } from '../api/config';

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
        const response = await fetch(`${API_BASE}/csrf-token`, {
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
const handleResponse = async (response: Response): Promise<any> => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 403 && data.error && data.error.includes('CSRF token mismatch')) {
            console.warn("CSRF token mismatch detected. Invalidating cached token and prompting refresh.");
            cachedCsrfToken = null;
            throw new Error("CSRF_TOKEN_EXPIRED_OR_INVALID");
        }

        const errorMsg =
            (typeof data.error === "string" && data.error) ||
            `HTTP error! status: ${response.status} - ${response.statusText}`;
        throw new Error(errorMsg);
    }

    return data;
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