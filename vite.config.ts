import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@worlds': path.resolve(import.meta.dirname, 'worlds'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});
