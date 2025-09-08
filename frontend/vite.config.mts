// frontend/vite.config.ts
/// <reference types="vitest" />
import { defineConfig, ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const proxyTarget = 'http://localhost:5033';
  const proxyPaths = [
    '/api',
    '/debug', // Debug endpoints
    '/sessions', // Session management
    '/logout-all', // Global logout
    '/security', // Security monitoring
    '/jobs', // Job progress
    '/docs', // Swagger docs
  ];

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
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
        if (!proxyTarget) return acc;
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
            if (id.includes('Hero') || id.includes('LandingPage')) {
              return 'critical-landing';
            }
            if (id.includes('landing/')) {
              return 'landing-sections';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'vendor-mui';
            }
            if (id.includes('react') && !id.includes('react-query')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query') || id.includes('react-query')) {
              return 'vendor-query';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animations';
            }
            if (id.includes('html5-qrcode') || id.includes('@dnd-kit') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        },
      },
    },
  };
});