// Shared helpers for tests that read the built `dist/` output directly off disk — the link
// checker and the migration tripwires that need to inspect generated HTML/CSS/headers.
//
// Filesystem-based rather than server-based on purpose (see Task 14 brief): it's fast, and it
// sidesteps the stale `wrangler pages dev` trap that has bitten prior verification passes on
// this branch (a lingering dev server on :8788 silently serving an old `dist/`). The tradeoff is
// that `dist/` itself can go stale the same way, so `assertDistIsFresh` below guards against
// reading yesterday's build.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR: string = path.resolve(HERE, '..', '..', '..');
export const DIST_DIR: string = path.join(ROOT_DIR, 'dist');

/** The 9 routes this site builds, matching the brief's link-checker sample. */
export const ROUTES: readonly string[] = [
  '/',
  '/green-card',
  '/visa',
  '/citizenship',
  '/contact',
  '/about',
  '/umra',
  '/privacy',
  '/blog',
];

function newestMtimeMs(dir: string): number {
  if (!existsSync(dir)) return 0;
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtimeMs(full));
    } else if (entry.isFile()) {
      newest = Math.max(newest, statSync(full).mtimeMs);
    }
  }
  return newest;
}

/**
 * Throws with an actionable message if `dist/` is missing or older than the source it was
 * supposedly built from, instead of letting stale output pass (or fail) silently. Call from a
 * `beforeAll` in any suite that reads `dist/`.
 */
export function assertDistIsFresh(): void {
  const indexHtml = path.join(DIST_DIR, 'index.html');
  if (!existsSync(indexHtml)) {
    throw new Error('dist/ is missing. Run `npm run build` before `npx vitest run`.');
  }

  const distMtime = statSync(indexHtml).mtimeMs;
  const watchedDirs = ['src', 'public', 'functions'].map((dir) => path.join(ROOT_DIR, dir));
  const watchedFiles = ['astro.config.mjs', 'package.json'].map((file) =>
    path.join(ROOT_DIR, file),
  );
  const sourceMtime = Math.max(
    ...watchedDirs.map(newestMtimeMs),
    ...watchedFiles.map((file) => statSync(file).mtimeMs),
  );

  if (sourceMtime > distMtime) {
    throw new Error(
      'dist/ is stale: source files changed since the last build. Run `npm run build` before ' +
        '`npx vitest run` (the same stale-output trap that affects `wrangler pages dev` on ' +
        'port 8788 applies to a filesystem-read `dist/` too).',
    );
  }
}

/** Maps a route (e.g. `/green-card`) to its built HTML file's absolute path. */
export function routeToDistFile(route: string): string {
  const name = route === '/' ? 'index' : route.replace(/^\//, '');
  return path.join(DIST_DIR, `${name}.html`);
}

export function readDistPage(route: string): string {
  return readFileSync(routeToDistFile(route), 'utf-8');
}

/**
 * Resolves a root-relative href/src (e.g. `/about`, `/css/style.css`, `/img/favicon.ico`) to the
 * `dist/` file it should point at. A path is treated as a page route (append `.html`) unless its
 * last segment already carries a file extension, in which case it's treated as a static asset
 * path as-is.
 */
export function resolveInternalPath(pathname: string): { absPath: string; exists: boolean } {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  let relative: string;
  if (trimmed === '/') {
    relative = 'index.html';
  } else {
    const lastSegment = trimmed.split('/').pop() ?? '';
    const hasExtension = /\.[a-z0-9]+$/i.test(lastSegment);
    relative = hasExtension ? trimmed.slice(1) : `${trimmed.slice(1)}.html`;
  }
  const absPath = path.join(DIST_DIR, relative);
  return { absPath, exists: existsSync(absPath) };
}

/** Extracts every `<tag ... attr="value" ...>` value for a given tag/attribute pair. */
export function extractAttr(html: string, tag: string, attr: string): string[] {
  const tagPattern = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const attrPattern = new RegExp(`\\b${attr}="([^"]*)"`, 'i');
  const values: string[] = [];
  for (const tagMatch of html.matchAll(tagPattern)) {
    const attrMatch = attrPattern.exec(tagMatch[0]);
    if (attrMatch?.[1] !== undefined) values.push(attrMatch[1]);
  }
  return values;
}

/** Every `id="..."` value present anywhere in a page, for fragment-target validation. */
export function extractIds(html: string): Set<string> {
  const ids = new Set<string>();
  for (const match of html.matchAll(/\bid="([^"]*)"/g)) {
    if (match[1]) ids.add(match[1]);
  }
  return ids;
}
