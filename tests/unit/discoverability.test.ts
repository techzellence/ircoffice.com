import { readFileSync } from 'node:fs';
import { beforeAll, expect, it } from 'vitest';
import { ROUTES, assertDistIsFresh, readDistPage, resolveInternalPath } from './lib/dist';

const origin = 'https://ircoffice.com';
const built = (name: string) => readFileSync(new URL(`../../dist/${name}`, import.meta.url), 'utf8');
beforeAll(assertDistIsFresh);

it('allows crawling and advertises the generated sitemap', () => {
  const robots = built('robots.txt');
  expect(robots).toMatch(/User-agent: \*\s+Allow: \//);
  expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m);
  expect(robots).toContain(`Sitemap: ${origin}/sitemap-index.xml`);
  expect(built('sitemap-index.xml')).toContain(`${origin}/sitemap-0.xml`);
});

it('publishes each page with unique metadata, one canonical URL, and visible HTML content', () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const sitemap = built('sitemap-0.xml');
  for (const route of ROUTES) {
    const html = readDistPage(route);
    const canonicals = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)];
    expect(canonicals, route).toHaveLength(1);
    expect(canonicals[0]?.[1], route).toBe(`${origin}${route}`);
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]!).href);
    expect(locations, route).toContain(`${origin}${route}`);
    expect(html, route).not.toMatch(/<meta[^>]+(?:name="(?:robots|googlebot)"[^>]+content="[^"]*noindex)/i);
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
    expect(heading?.replace(/<[^>]*>/g, '').trim(), route).toBeTruthy();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    expect(title, route).toBeTruthy();
    expect(description, route).toBeTruthy();
    expect(titles.has(title!), route).toBe(false);
    expect(descriptions.has(description!), route).toBe(false);
    titles.add(title!);
    descriptions.add(description!);
  }
});

it('provides an AI reading guide whose page links resolve to built content', () => {
  const guide = built('llms.txt');
  expect(guide).toContain('not a law firm');
  expect(guide).toContain('not affiliated with USCIS');
  for (const match of guide.matchAll(/\]\((https:\/\/ircoffice\.com[^)]*)\)/g)) {
    expect(resolveInternalPath(new URL(match[1]!).pathname).exists, match[1]).toBe(true);
  }
});
