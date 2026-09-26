import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@worlds': path.resolve(import.meta.dirname, '../worlds'),
      '@shared': path.resolve(import.meta.dirname, '../shared'),
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

