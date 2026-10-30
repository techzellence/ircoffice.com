import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';
import { assertDistIsFresh, extractAttr, resolveInternalPath } from './lib/dist';

beforeAll(assertDistIsFresh);
const read = (file: string) => readFileSync(new URL(`../../dist/${file}`, import.meta.url), 'utf8');

it('publishes all six approved articles with discoverable URLs and valid article metadata', () => {
  const files = readdirSync(new URL('../../src/content/blog/', import.meta.url)).filter(f => f.endsWith('.md'));
  expect(files).toHaveLength(6);
  const index = read('blog.html');
  const sitemap = read('sitemap-0.xml');
  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const route = `/blog/${slug}`;
    const canonical = `https://ircoffice.com${route}`;
    const html = read(`blog/${slug}.html`);
    expect(extractAttr(index, 'a', 'href')).toContain(route);
    expect(sitemap).toContain(`<loc>${canonical}</loc>`);
    expect(html).toContain(`rel="canonical" href="${canonical}"`);
    expect(html).toContain('property="og:type" content="article"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]!));
    const article = schemas.find(s => s['@type'] === 'BlogPosting');
    expect(article?.mainEntityOfPage).toBe(canonical);
    expect(article?.datePublished).toBe('2026-10-29');
    expect(article?.headline).toBeTruthy();
    for (const href of extractAttr(html, 'a', 'href').filter(h => h.startsWith('/') && !h.startsWith('//'))) {
      const url = new URL(href, 'https://ircoffice.com');
      expect(resolveInternalPath(url.pathname).exists, `${route}: ${href}`).toBe(true);
    }
  }
});
