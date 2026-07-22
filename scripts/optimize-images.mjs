// Generates AVIF and WebP siblings for the heavy CSS background images.
// Committed as a script so the conversion is reproducible and reviewable
// rather than a one-off binary drop. Run: node scripts/optimize-images.mjs
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'public', 'img');

const SOURCES = [
  'photo-1558834528-d2e28e4cf5cc.jpg',
  'photo-1550112764-28cf7fa2de60-2880w.jpg',
  'photo-1473625247510-8ceb1760943f.jpg',
  'photo-1520885161078-041b9f6ad3ef.jpg',
  'home-mobile-banner.jpg',
];

const kb = (p) => Math.round(statSync(p).size / 1024);

for (const file of SOURCES) {
  const src = path.join(IMG, file);
  const base = file.replace(/\.jpe?g$/i, '');
  const avif = path.join(IMG, `${base}.avif`);
  const webp = path.join(IMG, `${base}.webp`);

  await sharp(src).avif({ quality: 55 }).toFile(avif);
  await sharp(src).webp({ quality: 78 }).toFile(webp);

  console.log(`${file}: ${kb(src)}KB -> avif ${kb(avif)}KB, webp ${kb(webp)}KB`);
}
