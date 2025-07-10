import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
// import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    /* VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'FreeStream',
        short_name: 'FreeStream',
        description: 'Watch Movies & TV Shows Online',
        theme_color: '#ffffff',
        icons: []
      }
    }) */
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}); 