// frontend/vite.config.ts
/// <reference types="vitest" />
import { defineConfig, ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = 'http://localhost:5033';

const proxyPaths = [
  '/auth',
  '/products',
  '/customers',
  '/quotes',
  '/runs',
  '/csrf-token',
  '/verifyUser',
  '/user-status',
  '/upload',
  '/jobs',
];

export default defineConfig({
  plugins: [react()],
  envDir: '../',
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  server: {
    proxy: proxyPaths.reduce((acc, path) => {
      acc[path] = {
        target: proxyTarget,
        changeOrigin: true,
      };
      return acc;
    }, {} as Record<string, ProxyOptions>),
  },
});