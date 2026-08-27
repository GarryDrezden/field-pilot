import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        bootstrap: resolve(rootDir, 'src/content/bootstrap.ts'),
      },
      output: {
        format: 'iife',
        name: 'FieldPilotBootstrap',
        entryFileNames: '[name].js',
        inlineDynamicImports: true,
      },
    },
  },
});
