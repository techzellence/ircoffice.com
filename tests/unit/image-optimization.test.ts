import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROOT_DIR } from './lib/dist';

const IMG = path.join(ROOT_DIR, 'public', 'img');
const CSS = path.join(ROOT_DIR, 'public', 'css', 'style.css');

const CONVERTED = [
  'photo-1558834528-d2e28e4cf5cc',
  'photo-1550112764-28cf7fa2de60-2880w',
  'photo-1473625247510-8ceb1760943f',
  'photo-1520885161078-041b9f6ad3ef',
  'home-mobile-banner',
];

describe('CSS background image optimization', () => {
  for (const base of CONVERTED) {
    it(`${base} has AVIF and WebP siblings that are smaller than the JPEG`, () => {
      const jpg = path.join(IMG, `${base}.jpg`);
      const avif = path.join(IMG, `${base}.avif`);
      const webp = path.join(IMG, `${base}.webp`);

      expect(existsSync(avif), `${base}.avif missing`).toBe(true);
      expect(existsSync(webp), `${base}.webp missing`).toBe(true);
      expect(statSync(avif).size).toBeLessThan(statSync(jpg).size);
      expect(statSync(webp).size).toBeLessThan(statSync(jpg).size);
    });

    it(`${base} is served through image-set() with a plain-url fallback`, () => {
      const css = readFileSync(CSS, 'utf8');
      expect(css, `${base} has no image-set()`).toContain(`${base}.avif`);
      // The un-prefixed declaration must survive for browsers without image-set().
      expect(css, `${base} lost its plain url() fallback`).toContain(`url("../img/${base}.jpg")`);
    });
  }

  it('keeps the radial-gradient overlay on every converted background', () => {
    const css = readFileSync(CSS, 'utf8');
    const imageSetBlocks = css.match(/background-image:[^;}]*image-set\([^;}]*\)/g) ?? [];
    expect(imageSetBlocks.length).toBeGreaterThanOrEqual(4);
    for (const block of imageSetBlocks) {
      expect(block, `lost gradient: ${block.slice(0, 60)}`).toContain('radial-gradient');
    }
  });
});
