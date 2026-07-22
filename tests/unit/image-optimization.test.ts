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

      // The un-prefixed declaration must survive, as its own declaration, for browsers without
      // image-set() support -- AND it must come before the image-set() declaration, since CSS
      // applies the later of two same-property declarations. A regex can't safely bound either
      // declaration here: the CSS is minified/single-line and image-set() nests parens. Instead,
      // split on ';', '{', and '}' -- none of which appear inside a url()/image-set() value in
      // this file -- so each chunk is either a bare selector/media-query token or exactly one
      // declaration. (Splitting on ';' alone is not enough: a declaration that is last in its
      // rule block has no trailing ';', so it would get fused with everything up to the next
      // ';', however many selectors and unrelated declarations that spans.) This isolates each
      // `background-image:` declaration, with its start offset, letting us compare positions.
      const declarations: { start: number; text: string }[] = [];
      let declStart = 0;
      for (let i = 0; i < css.length; i++) {
        if (css[i] === ';' || css[i] === '{' || css[i] === '}') {
          declarations.push({ start: declStart, text: css.slice(declStart, i) });
          declStart = i + 1;
        }
      }
      declarations.push({ start: declStart, text: css.slice(declStart) });

      const backgroundImageDecls = declarations.filter((d) =>
        d.text.startsWith('background-image:'),
      );
      const imageSetDecl = backgroundImageDecls.find((d) =>
        d.text.includes(`image-set(url("../img/${base}.avif")`),
      );
      // Must be its own declaration ending in the plain url() -- not the type("image/jpeg")
      // entry that also lives inside the image-set() declaration.
      const fallbackDecl = backgroundImageDecls.find(
        (d) =>
          !d.text.includes('image-set(') && d.text.trimEnd().endsWith(`url("../img/${base}.jpg")`),
      );

      expect(imageSetDecl, `${base} has no image-set() background-image declaration`).toBeDefined();
      expect(
        fallbackDecl,
        `${base} lost its standalone plain url() fallback declaration`,
      ).toBeDefined();
      expect(
        fallbackDecl!.start,
        `${base} standalone url() fallback must precede its image-set() declaration, or the ` +
          'plain JPEG would win in every browser and defeat the AVIF/WebP optimization',
      ).toBeLessThan(imageSetDecl!.start);
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
