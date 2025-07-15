import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import envCompatible from 'vite-plugin-env-compatible';

export default defineConfig({
  plugins: [
    react(),
  ],

  define: {
    "process.env": {}, // Esto es opcional si ya usas envCompatible
  },
});