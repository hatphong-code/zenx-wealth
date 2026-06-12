import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
