import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' is mandatory: the app is served behind the HA ingress path prefix.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8099', ws: true },
    },
  },
});
