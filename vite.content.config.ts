import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(rootDir, 'src/content/index.tsx'),
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        inlineDynamicImports: true,
      },
    },
  },
});
