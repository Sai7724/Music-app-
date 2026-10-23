import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    tanstackRouter(),
    tailwindcss(),
    svgr(),
  ],
  // Capacitor serves from the dist folder — ensure absolute paths
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Increase chunk size slightly for mobile WebView — fewer network requests
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  define: {
    // Capacitor global
    '__CAPACITOR__': JSON.stringify(true),
  },
});
