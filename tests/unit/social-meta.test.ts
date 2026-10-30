// Social meta is invisible in normal use — nothing but a test catches a refactor
// that silently drops it, and the failure mode (links sharing as bare URLs) is
// only ever noticed by the client, in public.
import { beforeAll, describe, expect, it } from 'vitest';

import { ROUTES, assertDistIsFresh, readDistPage } from './lib/dist';

beforeAll(() => {
  assertDistIsFresh();
});

function meta(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/content="([^"]*)"/i)?.[1] ?? null;
}

describe('social sharing meta', () => {
  for (const route of ROUTES) {
    it(`${route} has complete Open Graph tags`, () => {
      const html = readDistPage(route);
      expect(meta(html, 'og:title'), 'og:title').toBeTruthy();
      expect(meta(html, 'og:description'), 'og:description').toBeTruthy();
      expect(meta(html, 'og:url'), 'og:url').toBeTruthy();
      expect(meta(html, 'og:site_name')).toBe('Immigrant Resource Center');
      expect(meta(html, 'og:locale')).toBe('en_US');
    });

    it(`${route} has an ABSOLUTE og:image`, () => {
      const img = meta(readDistPage(route), 'og:image');
      expect(img, 'og:image missing').toBeTruthy();
      expect(img, 'og:image must be absolute — relative URLs fail in most scrapers').toMatch(
        /^https:\/\/ircoffice\.com\//,
      );
    });

    it(`${route} has a large Twitter card`, () => {
      const html = readDistPage(route);
      expect(meta(html, 'twitter:card')).toBe('summary_large_image');
      expect(meta(html, 'twitter:title')).toBeTruthy();
      expect(meta(html, 'twitter:description')).toBeTruthy();
    });
  }
});
