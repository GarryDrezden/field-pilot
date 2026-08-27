import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');
const pdfWorkerSource = join(rootDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const pdfWorkerTarget = join(distDir, 'pdf.worker.min.mjs');

mkdirSync(join(distDir, 'icons'), { recursive: true });
mkdirSync(join(distDir, 'ocr', 'core'), { recursive: true });
mkdirSync(join(distDir, 'ocr', 'lang'), { recursive: true });

cpSync(join(publicDir, 'manifest.json'), join(distDir, 'manifest.json'));
copyFileSync(pdfWorkerSource, pdfWorkerTarget);

for (const size of [16, 48, 128]) {
  const source = join(publicDir, 'icons', `icon${size}.png`);
  const target = join(distDir, 'icons', `icon${size}.png`);
  if (existsSync(source)) {
    copyFileSync(source, target);
  }
}

const ocrWorkerSource = join(rootDir, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
const ocrWorkerTarget = join(distDir, 'ocr', 'worker.min.js');
copyFileSync(ocrWorkerSource, ocrWorkerTarget);

const coreFiles = [
  'tesseract-core.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
];

for (const fileName of coreFiles) {
  copyFileSync(
    join(rootDir, 'node_modules', 'tesseract.js-core', fileName),
    join(distDir, 'ocr', 'core', fileName),
  );
}

for (const lang of ['eng', 'rus']) {
  copyFileSync(
    join(rootDir, 'node_modules', `@tesseract.js-data/${lang}`, '4.0.0', `${lang}.traineddata.gz`),
    join(distDir, 'ocr', 'lang', `${lang}.traineddata.gz`),
  );
}

console.log('Assets copied to dist/');
