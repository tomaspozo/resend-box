import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/ui',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/sandbox': {
        target: 'http://localhost:4657',
        changeOrigin: true,
      },
      '/emails': {
        target: 'http://localhost:4657',
        changeOrigin: true,
      },
    },
  },
});

