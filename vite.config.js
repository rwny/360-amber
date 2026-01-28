import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces
    port: 3000,       // Port number to use
    strictPort: false // Automatically assign a free port if 3000 is busy
  },
  build: {
    outDir: 'dist'
  }
});