// app/config/api.ts
export const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api.smartpicker.au'
  : 'http://localhost:5033';

export const AUTH_URI = `${API_BASE}/auth/uri`;