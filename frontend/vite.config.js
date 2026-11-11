import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8000', rewrite: path => path.replace(/^\/api/, '') } },
    // The project journal at the repository root is shown inside the interface.
    fs: { allow: ['..'] },
  },
});
