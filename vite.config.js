import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ai-business/',
  plugins: [preact()],
  server: {
    proxy: {
      // Proxy requests from /api to the backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}); 