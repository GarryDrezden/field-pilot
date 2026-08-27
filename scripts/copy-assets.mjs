import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(rootDir, 'dist');
const publicDir = join(rootDir, 'public');

mkdirSync(join(distDir, 'icons'), { recursive: true });

cpSync(join(publicDir, 'manifest.json'), join(distDir, 'manifest.json'));

for (const size of [16, 48, 128]) {
  const source = join(publicDir, 'icons', `icon${size}.png`);
  const target = join(distDir, 'icons', `icon${size}.png`);
  if (existsSync(source)) {
    copyFileSync(source, target);
  }
}

console.log('Assets copied to dist/');
