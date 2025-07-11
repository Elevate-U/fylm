import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
// import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isVercel = !!process.env.VERCEL_ENV;

  return {
    plugins: [preact()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: isVercel ? undefined : {
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