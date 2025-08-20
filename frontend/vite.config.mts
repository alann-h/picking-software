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
  esbuild: {
    drop: ['console', 'debugger'],
  },
  
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
          // Critical landing page components - load first
          if (id.includes('Hero') || id.includes('LandingPage')) {
            return 'critical-landing';
          }
          
          // Landing page sections - load after hero
          if (id.includes('landing/')) {
            return 'landing-sections';
          }
          
          // Core UI components - keep MUI and Emotion together to avoid conflicts
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'vendor-mui';
          }
          
          // React core and router
          if (id.includes('react') && !id.includes('react-query')) {
            return 'vendor-react';
          }
          
          // Data fetching and state management
          if (id.includes('@tanstack/react-query') || id.includes('react-query')) {
            return 'vendor-query';
          }
          
          // Animation libraries - keep simple and avoid conflicts
          if (id.includes('framer-motion')) {
            return 'vendor-animations';
          }
          
          // Utility libraries
          if (id.includes('html5-qrcode') || id.includes('@dnd-kit') || id.includes('date-fns')) {
            return 'vendor-utils';
          }
          
          // All other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Add cache busting
        chunkFileNames: () => `js/[name]-[hash].js`,
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
    },
  },
});