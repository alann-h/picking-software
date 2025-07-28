// src/api/config.ts

/**
 * Base URL for API requests. Configurable via environment variable.
 * Ensure you set API_BASE_URL in your .env file (e.g., API_BASE_URL=http://localhost:5033)
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL;
  
/**
 * Auth endpoints
 */
export const AUTH_URI = `${API_BASE}/auth/uri`;


/**
 * Other endpoints can be added here:
 * export const PRODUCTS = `${API_BASE}/products`;
 */