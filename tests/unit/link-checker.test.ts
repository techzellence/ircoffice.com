// Task 14: crawls the BUILT `dist/` output (not a running server — see tests/unit/lib/dist.ts
// for why) and verifies every internal link resolves, every `_redirects` target is real, and no
// insecure (http://) link has crept in. External link *liveness* is intentionally not checked
// here: third-party sites going down would make this suite flaky for no actionable reason, and
// the brief is explicit that only internal breakage should fail the build.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  DIST_DIR,
  ROUTES,
  assertDistIsFresh,
  extractAttr,
  extractIds,
  readDistPage,
  resolveInternalPath,
} from './lib/dist';

beforeAll(() => {
  assertDistIsFresh();
});

/** Root-relative internal href/src values pulled from the tags that actually cause a browser to
 *  fetch a resource: `<a>`, `<link>`, `<script>`, `<img>`. Broader than an `<a>`-only crawler on
 *  purpose — it's what caught the dangling `/img/favicon.ico` reference documented in the Task
 *  14 report, which no `<a>` tag ever points at. */
function internalRefs(html: string): string[] {
  const raw = [
    ...extractAttr(html, 'a', 'href'),
    ...extractAttr(html, 'link', 'href'),
    ...extractAttr(html, 'script', 'src'),
    ...extractAttr(html, 'img', 'src'),
  ];
  return raw.filter((href) => href.startsWith('/') && !href.startsWith('//'));
}

/** `<a href>` values only — the ones a visitor actually clicks, and the ones the brief's "no
 *  leftover .html links" / "no anchors to missing ids" language is about. */
function anchorHrefs(html: string): string[] {
  return extractAttr(html, 'a', 'href');
}

describe('internal links resolve across all 9 built pages', () => {
  for (const route of ROUTES) {
    it(`${route === '/' ? '(home)' : route} has no internal 404s`, () => {
      const html = readDistPage(route);
      const broken: string[] = [];

      for (const ref of internalRefs(html)) {
        const [pathname] = ref.split('#');
        if (!pathname) continue; // fragment-only ref (e.g. "#tab-1"), not a resource fetch.
        const { exists } = resolveInternalPath(pathname);
        if (!exists) broken.push(ref);
      }

      expect(broken, `Broken internal refs on ${route}:\n${broken.join('\n')}`).toHaveLength(0);
    });
  }
});

describe('no leftover .html links', () => {
  for (const route of ROUTES) {
    it(`${route === '/' ? '(home)' : route} only uses clean-URL anchors`, () => {
      const html = readDistPage(route);
      const htmlLinks = anchorHrefs(html).filter((href) => /\.html(#.*)?$/i.test(href));

      expect(
        htmlLinks,
        `Legacy .html-style anchor(s) on ${route}: ${htmlLinks.join(', ')}`,
      ).toHaveLength(0);
    });
  }
});

describe('no anchors to missing ids', () => {
  for (const route of ROUTES) {
    it(`${route === '/' ? '(home)' : route} anchors resolve to a real id`, () => {
      const html = readDistPage(route);
      const ownIds = extractIds(html);
      const missing: string[] = [];

      for (const href of anchorHrefs(html)) {
        const [pathname, fragment] = href.split('#');
        if (fragment === undefined || fragment === '') continue; // no fragment, or bare "#".
        if (!pathname) {
          // Same-page anchor, e.g. "#tab-1".
          if (!ownIds.has(fragment)) missing.push(href);
          continue;
        }
        if (!pathname.startsWith('/')) continue; // external or non-root-relative; out of scope.
        const { exists, absPath } = resolveInternalPath(pathname);
        if (!exists) continue; // already reported by the 404 check above.
        const targetIds = extractIds(readFileSync(absPath, 'utf-8'));
        if (!targetIds.has(fragment)) missing.push(href);
      }

      expect(missing, `Anchor(s) to a missing id on ${route}: ${missing.join(', ')}`).toHaveLength(
        0,
      );
    });
  }
});

describe('no insecure (http://) links', () => {
  for (const route of ROUTES) {
    it(`${route === '/' ? '(home)' : route} has no plain-http references`, () => {
      const html = readDistPage(route);
      const values = [
        ...extractAttr(html, 'a', 'href'),
        ...extractAttr(html, 'link', 'href'),
        ...extractAttr(html, 'script', 'src'),
        ...extractAttr(html, 'img', 'src'),
      ];
      const insecure = values.filter((v) => v.startsWith('http://'));

      expect(insecure, `Insecure http:// reference(s) on ${route}: ${insecure.join(', ')}`).toHaveLength(
        0,
      );
    });
  }
});

describe('_redirects targets are real routes', () => {
  it('every redirect target resolves in the built output', () => {
    const redirectsPath = path.join(DIST_DIR, '_redirects');
    const lines = readFileSync(redirectsPath, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    expect(lines.length, '_redirects should not be empty').toBeGreaterThan(0);

    const broken: string[] = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const target = parts[1];
      if (!target) {
        broken.push(`${line} (could not parse a target column)`);
        continue;
      }
      if (/\.html$/i.test(target)) {
        broken.push(`${line} (target "${target}" is a leftover .html link, not a clean route)`);
        continue;
      }
      const { exists } = resolveInternalPath(target);
      if (!exists) broken.push(`${line} (target "${target}" does not resolve)`);
    }

    expect(broken, `Broken _redirects target(s):\n${broken.join('\n')}`).toHaveLength(0);
  });
});
