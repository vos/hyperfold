import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@worlds': path.resolve(import.meta.dirname, '../worlds'),
    },
  },
  server: {
    port: 5174,
    host: true,
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
  },
});

