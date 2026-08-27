import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const contentPath = join('dist', 'content.js');
const content = readFileSync(contentPath, 'utf8');

if (/\bimport\.meta\b/.test(content)) {
  console.error('Build verification failed: dist/content.js still contains import.meta');
  process.exit(1);
}

if (!content.includes('(function(){') && !content.includes('(function() {')) {
  console.error('Build verification failed: dist/content.js must be an IIFE bundle');
  process.exit(1);
}

console.log('Build verification passed: content.js is injectable');
