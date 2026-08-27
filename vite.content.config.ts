import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = dirname(fileURLToPath(import.meta.url));

function stripImportMeta(): Plugin {
  return {
    name: 'strip-import-meta',
    renderChunk(code) {
      return code
        .replace(/\bimport\.meta\.url\b/g, '""')
        .replace(/\bimport\.meta\b/g, '({ url: "" })');
    },
  };
}

export default defineConfig({
  plugins: [react(), stripImportMeta()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(rootDir, 'src/content/index.tsx'),
      },
      output: {
        format: 'iife',
        name: 'FieldPilotContent',
        entryFileNames: '[name].js',
        inlineDynamicImports: true,
      },
    },
  },
});
