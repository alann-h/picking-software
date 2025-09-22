// frontend/vite.config.ts
/// <reference types="vitest" />
import { defineConfig, ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import  ViteImageOptimize from 'vite-plugin-imagemin';
import { visualizer } from 'rollup-plugin-visualizer';

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
      tailwindcss(),
      // Image optimization plugin
      ViteImageOptimize({
        gifsicle: { optimizationLevel: 7 },
        mozjpeg: { quality: 80 },
        pngquant: { quality: [0.65, 0.8] },
        svgo: {
          plugins: [
            { name: 'removeViewBox', active: false },
            { name: 'removeEmptyAttrs', active: false }
          ]
        }
      }),
      // Bundle analyzer for production builds
      mode === 'production' && visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
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
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: (id) => {
            // Core React libraries
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // Heavy animation library - separate chunk
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            // Query library
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
              return 'forms';
            }
            // Drag and drop
            if (id.includes('@dnd-kit')) {
              return 'dnd';
            }
            // Utility libraries
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('js-cookie')) {
              return 'utils';
            }
            // Large components that should be separate
            if (id.includes('Quote') || id.includes('quote')) {
              return 'quote';
            }
            if (id.includes('Settings') || id.includes('UsersManagment')) {
              return 'admin';
            }
            // Default vendor chunk for other node_modules
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    },
    css: {
      devSourcemap: true
    }
  }
});