import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'ZenX Wealth',
        short_name: 'ZenX Wealth',
        description: 'Hệ điều hành tài chính cá nhân — Khởi đầu muộn, kết thúc tự do.',
        theme_color: '#0C1420',
        background_color: '#0C1420',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['finance', 'productivity'],
        lang: 'vi',
      },
      workbox: {
        // Cache app shell + assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Network-first for Firebase API calls, cache-first for static assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'firestore', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    css: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/@firebase/firestore') || id.includes('/@firebase/firestore-lite') || id.includes('/firebase/firestore')) return 'firebase-firestore';
          if (id.includes('/@firebase/auth') || id.includes('/firebase/auth')) return 'firebase-auth';
          if (id.includes('/@firebase/') || id.includes('/firebase/')) return 'firebase-core';
          if (id.includes('react-router-dom')) return 'router';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('date-fns')) return 'date-utils';
        },
      },
    },
  },
});
