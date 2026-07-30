import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Vite 5 blocks requests whose Host header isn't allowlisted (returns 403).
    // Allow the Docker service name "web" so the containerized Playwright runner
    // can reach the dev server at http://web:5173 instead of getting 403s.
    allowedHosts: ['web', 'localhost'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ready': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
