// src/api/config.ts

/**
 * Base URL for API requests. Configurable via environment variable.
 * Ensure you set REACT_APP_API_BASE_URL in your .env file (e.g., REACT_APP_API_BASE_URL=http://localhost:5033)
 */
console.log(process.env.REACT_APP_API_BASE_URL);
console.log(process.env.NODE_ENV);
export const API_BASE = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_BASE_URL
  : 'http://localhost:5033';
  

/**
 * Auth endpoints
 */
export const AUTH_URI = `${API_BASE}/auth/uri`;


/**
 * Other endpoints can be added here:
 * export const PRODUCTS = `${API_BASE}/products`;
 */