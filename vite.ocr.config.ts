import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist/ocr',
    emptyOutDir: true,
    lib: {
      entry: resolve(rootDir, 'src/ocr/tesseract/ocrEntry.ts'),
      formats: ['es'],
      fileName: () => 'ocrEngine.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
