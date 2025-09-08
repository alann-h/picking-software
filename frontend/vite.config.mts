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
      jsx: 'automatic',
      target: 'esnext',
      format: 'esm',
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
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    css: {
      devSourcemap: true
    }
  }
});