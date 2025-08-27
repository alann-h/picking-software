// src/api/config.ts

/**
 * Base URL for API requests. Configurable via environment variable.
 * Ensure you set API_BASE_URL in your .env file (e.g., API_BASE_URL=http://localhost:5033)
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL;
  
/**
 * Auth endpoints
 */
export const QBO_AUTH_URI = `${API_BASE}/api/auth/qbo-uri`;
export const XERO_AUTH_URI = `${API_BASE}/api/auth/xero-uri`;

/**
 * Core API endpoints (relative paths - apiCall functions add API_BASE)
 */
export const AUTH_BASE = 'api/auth';
export const CUSTOMERS_BASE = 'api/customers';
export const QUOTES_BASE = 'api/quotes';
export const PRODUCTS_BASE = 'api/products';
export const RUNS_BASE = 'api/runs';
export const PERMISSIONS_BASE = 'api/permissions';
export const WEBHOOKS_BASE = 'api/webhooks';

/**
 * Utility endpoints (relative paths - apiCall functions add API_BASE)
 */
export const CSRF_TOKEN = 'api/csrf-token';
export const VERIFY_USER = 'api/verifyUser';
export const USER_STATUS = 'api/user-status';

/**
 * Other endpoints can be added here as needed
 */