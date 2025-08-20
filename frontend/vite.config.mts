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
  plugins: [
    react()
  ],
  
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
  build: {
    cssCodeSplit: true,
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Add critical path optimization for landing page
          if (id.includes('landing/AnimatedSection')) {
            return 'critical-landing';
          }
          if (id.includes('html5-qrcode') || id.includes('@dnd-kit')) {
            return 'vendor-tools';
          }
          // Group MUI and Emotion libraries into a single chunk.
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'vendor-mui';
          }
          // Group React core and router into their own chunk.
          if (
            id.includes('react-router-dom') ||
            id.includes('react-dom') ||
            id.includes('react')
          ) {
            return 'vendor-react';
          }
          // Create a chunk for other large libraries like TanStack Query and Framer Motion.
          if (
            id.includes('@tanstack/react-query') ||
            id.includes('framer-motion')
          ) {
            return 'vendor-libs';
          }
          // Place all other node_modules into a default vendor chunk.
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});