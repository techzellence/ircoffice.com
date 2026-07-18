// Task 14: one tripwire per real defect this migration already fixed once. Each test guards
// against that specific defect quietly reappearing — see .superpowers/sdd/task-14-report.md for
// the fail-then-pass evidence proving each of these can actually catch a regression.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { ROOT_DIR, assertDistIsFresh } from './lib/dist';
import { findFilesContaining } from './lib/scan';

beforeAll(() => {
  assertDistIsFresh();
});

describe('migration tripwires', () => {
  it('no Google Maps API key is committed anywhere in shipped code', () => {
    // Defect: an unrestricted `AIzaSy...` key was committed in the old map.js. Maps now runs
    // through Leaflet + OpenStreetMap tiles (src/components/Map.astro), which needs no key.
    const hits = findFilesContaining(['src', 'functions', 'public', 'dist'], 'AIzaSy');
    expect(hits, `AIzaSy key material found in: ${hits.join(', ')}`).toHaveLength(0);
  });

  it('no Duda CDN (multiscreensite.com) references survive', () => {
    // Defect: old pages hotlinked irp-cdn.multiscreensite.com / lirp-cdn.multiscreensite.com,
    // which breaks the moment Duda hosting is cancelled.
    const hits = findFilesContaining(['src', 'dist'], 'multiscreensite');
    expect(hits, `Duda CDN reference found in: ${hits.join(', ')}`).toHaveLength(0);
  });

  it('the retired ga.js analytics script never returns', () => {
    // Defect: old pages loaded ssl.google-analytics.com/ga.js, dead since 2019.
    const hits = findFilesContaining(['src', 'public', 'dist'], 'google-analytics.com');
    expect(hits, `google-analytics.com reference found in: ${hits.join(', ')}`).toHaveLength(0);
  });

  it('jQuery/GSAP/Swiper are not loaded from a public CDN', () => {
    // Defect: jQuery/GSAP/Swiper used to be pulled from CDNs at runtime. They're npm
    // dependencies now, bundled by Vite — a CDN <script>/<link> reference reappearing means
    // someone reverted to the old loading strategy.
    const cdns = ['code.jquery.com', 'cdnjs.cloudflare.com', 'unpkg.com', 'cdn.jsdelivr.net'];
    const hits = cdns.flatMap((cdn) =>
      findFilesContaining(['src', 'dist'], cdn).map((file) => `${cdn} in ${file}`),
    );
    expect(hits, `CDN-loaded script reference(s) found:\n${hits.join('\n')}`).toHaveLength(0);
  });

  it('ConsultForm gates the success message on response.ok', () => {
    // Defect: the original handler's `.then()` showed the success message regardless of the
    // fetch response, so failed submissions silently looked like successes and leads were lost.
    const source = readFileSync(
      path.join(ROOT_DIR, 'src/components/ConsultForm.astro'),
      'utf-8',
    );
    const scriptMatch = /<script>([\s\S]*)<\/script>/.exec(source);
    if (!scriptMatch?.[1]) throw new Error('ConsultForm.astro should have an inline <script>');
    const script = scriptMatch[1];

    const gateMatch = /if\s*\(\s*!?\s*\w+\.ok\b/.exec(script);
    expect(
      gateMatch,
      'submit handler must gate success on a `response.ok` (or equivalent) check',
    ).not.toBeNull();
    if (!gateMatch) throw new Error('unreachable: asserted above');

    const successIndex = script.indexOf('Thank you for contacting us');
    expect(successIndex, 'success message markup not found in submit handler').toBeGreaterThan(
      -1,
    );
    expect(gateMatch.index).toBeLessThan(successIndex);
  });

  it('_headers CSP font-src allows data: for the vendored Swiper icon font', () => {
    // Defect: font-src without `data:` blocks Swiper's inlined icon font, breaking carousel
    // arrows with no visible error — just missing glyphs.
    const headers = readFileSync(path.join(ROOT_DIR, 'public/_headers'), 'utf-8');
    const cspMatch = /Content-Security-Policy:\s*([^\n]+)/i.exec(headers);
    if (!cspMatch?.[1]) {
      throw new Error('no Content-Security-Policy header found in public/_headers');
    }

    const fontSrcMatch = /font-src\s+([^;]+)/i.exec(cspMatch[1]);
    if (!fontSrcMatch?.[1]) throw new Error('no font-src directive found in the CSP');

    const tokens = fontSrcMatch[1].trim().split(/\s+/);
    expect(tokens, `font-src tokens: ${tokens.join(' ')}`).toContain('data:');
  });

  it('.form__label is never hidden from the accessibility tree', () => {
    // Defect: .form__label used visibility:hidden / display:none to visually hide labels,
    // which also strips them from the a11y tree — screen readers announced unlabeled inputs.
    // The fix is a clip-based visually-hidden pattern instead.
    const css = readFileSync(path.join(ROOT_DIR, 'public/css/style.css'), 'utf-8');
    const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
    let match: RegExpExecArray | null;
    let found = false;

    while ((match = ruleRegex.exec(css)) !== null) {
      const [, selectorList, body] = match;
      const selectors = (selectorList ?? '').split(',').map((s) => s.trim());
      if (!selectors.includes('.form__label')) continue;
      found = true;
      const normalizedBody = (body ?? '').replace(/\s+/g, '');
      expect(normalizedBody, `.form__label rule: ${body}`).not.toMatch(/visibility:hidden/i);
      expect(normalizedBody, `.form__label rule: ${body}`).not.toMatch(/display:none/i);
    }

    expect(found, '.form__label rule not found in public/css/style.css').toBe(true);
  });
});
