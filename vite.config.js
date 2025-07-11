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
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat'
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/image-proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}); 