import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
// import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [preact()],
    resolve: {
      alias: {
        'react-dom/test-utils': 'preact/test-utils',
        'react-dom': 'preact/compat',
        react: 'preact/compat',
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: true,
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'preact/compat'],
            'router-vendor': ['react-router-dom'],
          },
        },
      },
    },
  };
}); 