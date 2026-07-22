# Technical SEO & Performance Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give ircoffice.com working social share cards, machine-readable business data, and optimized images — the technical foundation later content work depends on.

**Architecture:** Astro static site on Cloudflare Pages. Social/schema metadata is emitted from the single shared `BaseLayout`, with the schema objects built by a pure, unit-testable module in `src/lib/`. Image optimization is split by where the weight actually is: 91% sits in CSS `background-image` (handled with `image-set()` + generated AVIF/WebP), the remaining 9% in `<img>` tags (handled with Astro's `<Image>`).

**Tech Stack:** Astro 5, TypeScript (strict), Vitest, Playwright, sharp 0.34.5 (already an Astro dependency).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-seo-performance-foundation-design.md`
- Schema type is `ProfessionalService`. **Never `LegalService`** — that asserts a legal-services provider, which a non-attorney practice must not claim.
- `og:image` and all schema URLs must be **absolute**. Relative `og:image` silently fails on most scrapers.
- Site origin is `https://www.ircoffice.com`.
- NAP values, byte-exact, matching what the pages already render:
  - name `Immigrant Resource Center`
  - telephone `(612) 822-5747`
  - street `1 W Lake St Ste #165`, city `Minneapolis`, region `MN`, postal `55408`, country `US`
  - geo `44.948306738076035`, `-93.27877182892344`
  - hours Mo–Fr `09:00`–`18:00`, Sa `10:00`–`17:00`
  - foundingDate `1999`
- Do NOT add `sameAs` — real social URLs do not exist yet.
- TypeScript strict; explicit return types on exported functions; no `any` without a justifying comment.
- Indentation 2 spaces; line length 100.
- Conventional commits; one logical change per commit.
- Existing suites must stay green: 81 unit, 10 E2E, `tsc --noEmit` clean.
- Stale-server trap: `wrangler pages dev` does not match `pkill -f "wrangler pages dev"`. Kill by port: `lsof -ti tcp:8788 | xargs kill -9`, confirm empty, then rebuild.

---

### Task 1: Generate the Open Graph card image

**Files:**
- Create: `scripts/build-og-card.mjs`
- Create: `public/og-card.png` (generated, committed)

**Interfaces:**
- Produces: `public/og-card.png`, 1200×630, referenced by Task 2 as `/og-card.png`.

- [ ] **Step 1: Write the generator script**

`scripts/build-og-card.mjs`:

```js
// Generates the 1200x630 Open Graph card committed at public/og-card.png.
// Committed as a script rather than a hand-made image so the card can be
// regenerated when the brand changes. Run: node scripts/build-og-card.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'og-card.png');

// Brand navy, matching .form-box / footer background in public/css/style.css.
const NAVY = '#174171';
const ORANGE = '#f39b4b';

const logo = readFileSync(path.join(ROOT, 'public', 'img', 'company-logo.jpeg'));
const logoDataUri = `data:image/jpeg;base64,${logo.toString('base64')}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${NAVY}"/>
  <rect x="0" y="606" width="1200" height="24" fill="${ORANGE}"/>
  <image href="${logoDataUri}" x="90" y="150" width="420" preserveAspectRatio="xMinYMin meet"/>
  <text x="90" y="400" font-family="Helvetica, Arial, sans-serif" font-size="62" font-weight="700" fill="#ffffff">Immigrant Resource Center</text>
  <text x="90" y="470" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="400" fill="${ORANGE}">Immigration &amp; Travel Services</text>
  <text x="90" y="524" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="400" fill="#cbd6e4">Minneapolis, Minnesota &#183; Since 1999</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log(`wrote ${OUT}`);
```

- [ ] **Step 2: Run it**

Run: `node scripts/build-og-card.mjs`
Expected: `wrote .../public/og-card.png`

- [ ] **Step 3: Verify dimensions and legibility**

Run: `node -e "require('sharp')('public/og-card.png').metadata().then(m=>console.log(m.width+'x'+m.height))"`
Expected: `1200x630`

Then open `public/og-card.png` and check the text is readable when scaled to ~300px wide (WhatsApp thumbnail size). If the business name wraps or clips, reduce `font-size` and regenerate. Record what you saw in the report.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-og-card.mjs public/og-card.png
git commit -m "feat: add generated Open Graph card image"
```

---

### Task 2: Open Graph and Twitter Card meta

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Test: `tests/unit/social-meta.test.ts`

**Interfaces:**
- Consumes: `/og-card.png` from Task 1.
- Produces: `BaseLayout` accepts two new optional props — `ogType?: 'website' | 'article'` (default `'website'`) and `ogImage?: string` (default `'/og-card.png'`). All 9 existing pages keep working unchanged.

- [ ] **Step 1: Write the failing test**

`tests/unit/social-meta.test.ts`:

```ts
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
        /^https:\/\/www\.ircoffice\.com\//,
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run build && npx vitest run tests/unit/social-meta.test.ts`
Expected: FAIL — every assertion, because no OG tags exist yet.

- [ ] **Step 3: Add the meta to BaseLayout**

In `src/layouts/BaseLayout.astro`, replace the frontmatter block with:

```astro
---
import Footer from '../components/Footer.astro';
import Nav from '../components/Nav.astro';

interface Props {
  title: string;
  description: string;
  canonical: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
}

const SITE_ORIGIN = 'https://www.ircoffice.com';

const {
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = '/og-card.png',
} = Astro.props;

// Scrapers (WhatsApp, Facebook, X) require absolute URLs; a relative og:image
// is the usual reason a card validates in a tool but renders blank in a chat.
const ogImageUrl = new URL(ogImage, SITE_ORIGIN).href;
---
```

Then insert immediately after the existing `<link rel="canonical" ... />` line:

```astro
    <meta property="og:type" content={ogType} />
    <meta property="og:site_name" content="Immigrant Resource Center" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Immigrant Resource Center — Immigration & Travel Services, Minneapolis" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImageUrl} />
```

- [ ] **Step 4: Run the test green**

Run: `npm run build && npx vitest run tests/unit/social-meta.test.ts`
Expected: PASS (27 tests — 9 routes × 3).

- [ ] **Step 5: Confirm no regressions**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all green, `tsc` silent.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro tests/unit/social-meta.test.ts
git commit -m "feat: add Open Graph and Twitter Card meta to every page"
```

---

### Task 3: ProfessionalService and BreadcrumbList structured data

**Files:**
- Create: `src/lib/schema.ts`
- Modify: `src/layouts/BaseLayout.astro`
- Test: `tests/unit/schema.test.ts`

**Interfaces:**
- Consumes: `SITE_ORIGIN` convention from Task 2.
- Produces:
  - `export const BUSINESS: BusinessInfo`
  - `export function professionalServiceSchema(origin: string): Record<string, unknown>`
  - `export function breadcrumbSchema(origin: string, crumbs: readonly Crumb[]): Record<string, unknown>`
  - `export interface Crumb { name: string; path: string }`

- [ ] **Step 1: Write the failing test**

`tests/unit/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { BUSINESS, breadcrumbSchema, professionalServiceSchema } from '../../src/lib/schema';

const ORIGIN = 'https://www.ircoffice.com';

describe('professionalServiceSchema', () => {
  const schema = professionalServiceSchema(ORIGIN);

  it('is a ProfessionalService, never a LegalService', () => {
    // IRC is not a law firm. schema.org LegalService would assert to Google that
    // it is one — the exact claim the disclaimer exists to deny.
    expect(schema['@type']).toBe('ProfessionalService');
    expect(JSON.stringify(schema)).not.toContain('LegalService');
  });

  it('carries NAP that matches the rendered pages exactly', () => {
    expect(schema.name).toBe('Immigrant Resource Center');
    expect(schema.telephone).toBe('(612) 822-5747');
    const address = schema.address as Record<string, string>;
    expect(address.streetAddress).toBe('1 W Lake St Ste #165');
    expect(address.addressLocality).toBe('Minneapolis');
    expect(address.addressRegion).toBe('MN');
    expect(address.postalCode).toBe('55408');
  });

  it('uses absolute URLs', () => {
    expect(schema.url).toBe(`${ORIGIN}/`);
    expect(String(schema.image)).toMatch(/^https:\/\//);
  });

  it('publishes both opening-hours blocks', () => {
    const hours = schema.openingHoursSpecification as Array<Record<string, unknown>>;
    expect(hours).toHaveLength(2);
    expect(hours[0].opens).toBe('09:00');
    expect(hours[0].closes).toBe('18:00');
    expect(hours[1].dayOfWeek).toEqual(['Saturday']);
    expect(hours[1].closes).toBe('17:00');
  });

  it('omits sameAs while no real social profiles exist', () => {
    expect(schema.sameAs).toBeUndefined();
  });

  it('geo-locates the office', () => {
    const geo = schema.geo as Record<string, number>;
    expect(geo.latitude).toBeCloseTo(44.9483, 3);
    expect(geo.longitude).toBeCloseTo(-93.2787, 3);
  });
});

describe('breadcrumbSchema', () => {
  it('numbers positions from 1 and resolves absolute item URLs', () => {
    const schema = breadcrumbSchema(ORIGIN, [
      { name: 'Home', path: '/' },
      { name: 'Green Card', path: '/green-card' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    const items = schema.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(items[1].item).toBe(`${ORIGIN}/green-card`);
  });
});

describe('BUSINESS', () => {
  it('records the confirmed founding year', () => {
    expect(BUSINESS.foundingYear).toBe(1999);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/schema'`.

- [ ] **Step 3: Write the module**

`src/lib/schema.ts`:

```ts
// Machine-readable business data for search engines. Values here MUST stay
// byte-identical to what the pages render and to the client's Google Business
// Profile — mismatched name/address/phone actively harms local ranking.

export interface BusinessInfo {
  name: string;
  telephone: string;
  email: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
  latitude: number;
  longitude: number;
  foundingYear: number;
}

export const BUSINESS: BusinessInfo = {
  name: 'Immigrant Resource Center',
  telephone: '(612) 822-5747',
  email: 'info@ircoffice.com',
  streetAddress: '1 W Lake St Ste #165',
  addressLocality: 'Minneapolis',
  addressRegion: 'MN',
  postalCode: '55408',
  addressCountry: 'US',
  latitude: 44.948306738076035,
  longitude: -93.27877182892344,
  foundingYear: 1999,
};

export interface Crumb {
  name: string;
  path: string;
}

/**
 * ProfessionalService — deliberately NOT LegalService. IRC is a non-attorney
 * practice; LegalService would assert otherwise to every consumer of this data.
 */
export function professionalServiceSchema(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${origin}/#business`,
    name: BUSINESS.name,
    url: `${origin}/`,
    image: `${origin}/og-card.png`,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    foundingDate: String(BUSINESS.foundingYear),
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '10:00',
        closes: '17:00',
      },
    ],
    areaServed: {
      '@type': 'City',
      name: 'Minneapolis',
    },
  };
}

export function breadcrumbSchema(
  origin: string,
  crumbs: readonly Crumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path === '/' ? '/' : crumb.path}`,
    })),
  };
}
```

- [ ] **Step 4: Run the test green**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Emit the JSON-LD from BaseLayout**

Add to the `BaseLayout.astro` frontmatter, after the existing imports:

```astro
import { breadcrumbSchema, professionalServiceSchema } from '../lib/schema';
```

Add after the `ogImageUrl` line:

```astro
const businessSchema = professionalServiceSchema(SITE_ORIGIN);

// Breadcrumbs only make sense below the root; the home page is the root.
const pagePath = new URL(canonical).pathname;
const crumbs =
  pagePath === '/'
    ? null
    : breadcrumbSchema(SITE_ORIGIN, [
        { name: 'Home', path: '/' },
        { name: title.split('|')[0].trim(), path: pagePath },
      ]);
```

Then immediately before the closing `</head>`, before `<slot name="head" />`:

```astro
    <script type="application/ld+json" is:inline set:html={JSON.stringify(businessSchema)} />
    {crumbs && <script type="application/ld+json" is:inline set:html={JSON.stringify(crumbs)} />}
```

- [ ] **Step 6: Add the built-output tripwire**

Append to `tests/unit/schema.test.ts`:

```ts
import { ROUTES, assertDistIsFresh, readDistPage } from './lib/dist';

describe('structured data in built output', () => {
  beforeAll(() => {
    assertDistIsFresh();
  });

  for (const route of ROUTES) {
    it(`${route} emits parseable ProfessionalService JSON-LD`, () => {
      const html = readDistPage(route);
      const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
      expect(blocks.length, 'no JSON-LD found').toBeGreaterThan(0);

      const parsed = blocks.map((m) => JSON.parse(m[1]) as Record<string, unknown>);
      const business = parsed.find((p) => p['@type'] === 'ProfessionalService');
      expect(business, 'no ProfessionalService block').toBeTruthy();
      expect(business!.telephone).toBe('(612) 822-5747');
      expect(JSON.stringify(parsed)).not.toContain('LegalService');
    });
  }
});
```

Add `beforeAll` to the vitest import at the top of the file.

- [ ] **Step 7: Verify everything**

Run: `npm run build && npx vitest run && npx tsc --noEmit`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schema.ts src/layouts/BaseLayout.astro tests/unit/schema.test.ts
git commit -m "feat: add ProfessionalService and BreadcrumbList structured data"
```

---

### Task 4: Optimize CSS background images (91% of the weight)

**Files:**
- Create: `scripts/optimize-images.mjs`
- Modify: `public/css/style.css`
- Create: `public/img/*.avif`, `public/img/*.webp` (generated, committed)
- Test: `tests/unit/image-optimization.test.ts`

**Interfaces:**
- Produces: `.avif` and `.webp` siblings for each heavy CSS background; `style.css` serving them via `image-set()`.

The five files to convert, with current sizes:

| File | Size |
|---|---|
| `photo-1558834528-d2e28e4cf5cc.jpg` | 379 KB |
| `photo-1550112764-28cf7fa2de60-2880w.jpg` | 306 KB |
| `photo-1473625247510-8ceb1760943f.jpg` | 293 KB |
| `photo-1520885161078-041b9f6ad3ef.jpg` | 269 KB |
| `home-mobile-banner.jpg` | 150 KB |

- [ ] **Step 1: Write the conversion script**

`scripts/optimize-images.mjs`:

```js
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
```

- [ ] **Step 2: Run it and record the savings**

Run: `node scripts/optimize-images.mjs`
Expected: five lines showing each conversion. AVIF should land well under half the JPEG size. Paste the output into your report.

- [ ] **Step 3: Rewrite the CSS to use `image-set()`**

`public/css/style.css` is minified and single-line. These backgrounds are **layered** — a `radial-gradient` sits on top of the photo — so the gradient must be preserved and only the `url(...)` layer wrapped.

For each of the five images, replace the single declaration with a **pair**: the original (fallback for browsers without `image-set()`), then the `image-set()` version. The later declaration wins where supported; the earlier is used where not.

Pattern — for `photo-1550112764-28cf7fa2de60-2880w.jpg`, replace:

```css
background-image:radial-gradient(circle, rgba(23,65,113,0.9) 100%, rgba(32,88,225,0.9) 100%),url("../img/photo-1550112764-28cf7fa2de60-2880w.jpg")
```

with:

```css
background-image:radial-gradient(circle, rgba(23,65,113,0.9) 100%, rgba(32,88,225,0.9) 100%),url("../img/photo-1550112764-28cf7fa2de60-2880w.jpg");background-image:radial-gradient(circle, rgba(23,65,113,0.9) 100%, rgba(32,88,225,0.9) 100%),image-set(url("../img/photo-1550112764-28cf7fa2de60-2880w.avif") type("image/avif"),url("../img/photo-1550112764-28cf7fa2de60-2880w.webp") type("image/webp"),url("../img/photo-1550112764-28cf7fa2de60-2880w.jpg") type("image/jpeg"))
```

Apply the same transformation to the other four, preserving each one's own gradient values exactly — they differ (`0.9`, `0.8`, `0.91`). Do not normalize them.

- [ ] **Step 4: Write the test**

`tests/unit/image-optimization.test.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/unit/image-optimization.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 6: Verify rendering — this is the risky step**

`style.css` drives every hero. Kill stale servers by port, rebuild, serve, and check each affected page actually renders its background:

```bash
lsof -ti tcp:8788 | xargs kill -9 2>/dev/null; sleep 2
npm run build
npx wrangler pages dev dist --port 8788 --ip 127.0.0.1
```

Load `/`, `/green-card`, `/visa`, `/citizenship`, `/contact` and confirm each hero image still appears and the navy gradient overlay is intact. In DevTools, confirm the network tab shows `.avif` being fetched rather than `.jpg`. Screenshot at least the home hero. Record findings in the report.

- [ ] **Step 7: Commit**

```bash
git add scripts/optimize-images.mjs public/img/*.avif public/img/*.webp public/css/style.css tests/unit/image-optimization.test.ts
git commit -m "perf: serve heavy CSS backgrounds as AVIF/WebP via image-set()"
```

---

### Task 5: Convert logo `<img>` tags to Astro `<Image>`

**Files:**
- Create: `src/assets/img/` (move 4 files here)
- Modify: `src/components/Nav.astro`, `src/components/Footer.astro`, `src/pages/index.astro`

**Interfaces:**
- Consumes: nothing from Task 4.
- Produces: logos served as AVIF/WebP with intrinsic `width`/`height`.

Move these four only:

| File | Used by |
|---|---|
| `company-logo.jpeg` | `Nav.astro`, `Footer.astro` |
| `logo.jpeg` | `Nav.astro`, `Footer.astro` |
| `logo-640w.jpeg` | `Nav.astro` |
| `Divider-Decorative_01.png` | `index.astro` |

**Do NOT move or convert:** `favicon.ico` (referenced from `<head>`), `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png` (fetched by Leaflet at runtime — they must keep stable public paths), `gmail-icon.png`, `dropdown-small.png` (both under 1 KB; conversion overhead exceeds any saving).

- [ ] **Step 1: Move the files**

```bash
mkdir -p src/assets/img
git mv public/img/company-logo.jpeg src/assets/img/company-logo.jpeg
git mv public/img/logo.jpeg src/assets/img/logo.jpeg
git mv public/img/logo-640w.jpeg src/assets/img/logo-640w.jpeg
git mv public/img/Divider-Decorative_01.png src/assets/img/Divider-Decorative_01.png
```

- [ ] **Step 2: Update `Nav.astro`**

Add to the frontmatter:

```astro
import { Image } from 'astro:assets';

import companyLogo from '../assets/img/company-logo.jpeg';
import logo640 from '../assets/img/logo-640w.jpeg';
import logo from '../assets/img/logo.jpeg';
```

Replace each `<img src="/img/company-logo.jpeg" ... />` with `<Image src={companyLogo} ... />`, keeping every existing `class`, `alt`, and `width` attribute exactly as-is. Do the same for `logo.jpeg` → `logo` and `logo-640w.jpeg` → `logo640`.

- [ ] **Step 3: Update `Footer.astro` and `index.astro`**

Same pattern. `Footer.astro` uses `company-logo.jpeg` and `logo.jpeg`; `index.astro` uses `Divider-Decorative_01.png` (import it as `divider`).

- [ ] **Step 4: Build and verify no raw references survive**

Run:
```bash
npm run build
grep -rn "/img/company-logo\|/img/logo\.jpeg\|/img/logo-640w\|/img/Divider-Decorative" src/ && echo "STALE REFS" || echo "clean"
```
Expected: `clean`.

- [ ] **Step 5: Confirm the build emits optimized formats**

Run: `ls dist/_astro/*.webp dist/_astro/*.avif 2>/dev/null | head`
Expected: at least one generated file. If empty, the `<Image>` conversion did not take — recheck the imports.

- [ ] **Step 6: Verify rendering**

Rebuild and serve (kill port 8788 first, as in Task 4). Confirm the logo appears in the header and footer on `/` and one inner page, at the same size as before. Screenshot the header.

- [ ] **Step 7: Run all suites**

Run: `npx vitest run && npx tsc --noEmit && npx playwright test tests/e2e/`
Expected: 81+ unit, `tsc` clean, 10 E2E.

- [ ] **Step 8: Commit**

```bash
git add -A src/ public/
git commit -m "perf: serve logos through Astro <Image>"
```

---

### Task 6: Delete orphaned images

**Files:**
- Delete: ~95 files under `public/img/`
- Test: `tests/unit/image-optimization.test.ts` (append)

- [ ] **Step 1: Regenerate the orphan list — verify across ALL sources**

Task 5 moved four files, so the list must be recomputed. Check every place a path could hide, not just `src/`:

```bash
cd "$(git rev-parse --show-toplevel)"
for f in public/img/*; do
  b=$(basename "$f")
  if ! grep -rqF "$b" src/ public/css/ public/_headers public/_redirects astro.config.mjs 2>/dev/null; then
    echo "$b"
  fi
done | tee /tmp/orphans.txt | wc -l
```

- [ ] **Step 2: Sanity-check the list before deleting**

Confirm `favicon.ico`, `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`, `gmail-icon.png`, `dropdown-small.png` and every `.avif`/`.webp` you generated in Task 4 are **NOT** in `/tmp/orphans.txt`. If any appear, stop — the grep is wrong, not the file.

```bash
grep -E "favicon|marker-|gmail-icon|dropdown-small|\.avif$|\.webp$" /tmp/orphans.txt && echo "STOP — false positive" || echo "safe to delete"
```

- [ ] **Step 3: Delete**

```bash
cd public/img && xargs -a /tmp/orphans.txt rm -- && cd ../..
git add -A public/img
```

- [ ] **Step 4: Rebuild and confirm nothing broke**

Run: `npm run build && npx vitest run && npx playwright test tests/e2e/`
Expected: all green. Record the `du -sh public/img dist` before/after in your report.

- [ ] **Step 5: Add a regression guard**

Append to `tests/unit/image-optimization.test.ts`:

```ts
describe('image hygiene', () => {
  it('ships no unreferenced images', () => {
    // 95 unused Duda stock files (9.1 MB) once shipped with every deploy.
    const KEEP = /^(favicon\.ico|marker-icon(-2x)?\.png|marker-shadow\.png)$/;
    const files = readdirSync(IMG).filter((f) => !KEEP.test(f));
    const haystack = [
      readFileSync(CSS, 'utf8'),
      ...scanDir(path.join(ROOT_DIR, 'src')),
    ].join('\n');

    const orphans = files.filter((f) => {
      const base = f.replace(/\.(avif|webp)$/, '');
      return !haystack.includes(f) && !haystack.includes(base);
    });
    expect(orphans, `unreferenced images: ${orphans.join(', ')}`).toHaveLength(0);
  });
});
```

Add at the top of the file:

```ts
import { readdirSync } from 'node:fs';

function scanDir(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => readFileSync(path.join(e.parentPath ?? dir, e.name), 'utf8'));
}
```

- [ ] **Step 6: Run it**

Run: `npx vitest run tests/unit/image-optimization.test.ts`
Expected: PASS. If it flags a file you deliberately kept, add it to `KEEP` with a comment explaining why.

- [ ] **Step 7: Commit**

```bash
git add -A public/img tests/unit/image-optimization.test.ts
git commit -m "chore: delete 9.1MB of unreferenced Duda stock images"
```

---

### Task 7: Re-baseline the visual regression suite

**Files:**
- Modify: `tests/visual/compare-live.spec.ts`
- Delete: `tests/visual/baseline/*.png` (replaced)
- Modify: `scripts/capture-live.ts` (retire)

- [ ] **Step 1: Understand what exists**

Read `tests/visual/compare-live.spec.ts` and `scripts/capture-live.ts`. The suite screenshots the **live Duda site** and diffs our build against it. That comparison proved cutover fidelity and has now served its purpose: the site has deliberately diverged (darker brand orange for WCAG AA, COVID banners removed, copy rewritten), so the suite fails by design.

- [ ] **Step 2: Convert it to a self-baseline suite**

Rename to `tests/visual/regression.spec.ts` and rewrite so it screenshots the local build and compares against committed baselines of **our own** current known-good output — not the live site. Keep the existing 9 routes × 3 viewports. Keep the `maxDiffPixelRatio: 0.02` tolerance and the masking of the map region (tiles shift between runs).

```bash
git mv tests/visual/compare-live.spec.ts tests/visual/regression.spec.ts
```

- [ ] **Step 3: Retire the live-capture script**

`scripts/capture-live.ts` captures from ircoffice.com. Once Duda is cancelled it cannot run at all. Delete it; the Duda baselines remain in git history as the cutover record.

```bash
git rm scripts/capture-live.ts
git rm tests/visual/baseline/*.png
```

- [ ] **Step 4: Generate fresh baselines**

```bash
lsof -ti tcp:8788 | xargs kill -9 2>/dev/null; sleep 2
npm run build
npx playwright test tests/visual/ --update-snapshots
```

- [ ] **Step 5: Verify the suite passes against itself**

Run: `npx playwright test tests/visual/`
Expected: all green (27 tests). A second run must also pass — if it flakes, something non-deterministic is unmasked (animation, carousel position, map tiles). Fix by masking, not by raising the threshold.

- [ ] **Step 6: Commit**

```bash
git add -A tests/visual/ scripts/
git commit -m "test: re-baseline visual regression against current build"
```

---

### Task 8: Final verification

- [ ] **Step 1: Full suite**

```bash
lsof -ti tcp:8788 | xargs kill -9 2>/dev/null; sleep 2
npm run build
npx vitest run
npx tsc --noEmit
npx playwright test
```
Expected: all green.

- [ ] **Step 2: Measure what changed**

```bash
du -sh dist public/img
```
Record before/after against the baseline in the spec (`dist` was 12 MB, `public/img` 11 MB).

- [ ] **Step 3: Validate the structured data externally**

Paste the JSON-LD from `dist/index.html` into Google's Rich Results Test. Confirm it parses with no errors and is recognised as a business. Note any warnings in the report — warnings about optional fields are acceptable; errors are not.

- [ ] **Step 4: Validate a social card**

Confirm `dist/index.html`'s `og:image` resolves to a real absolute URL and the file exists at `public/og-card.png`. Full validation needs a public URL, so note it as a post-deploy check.

- [ ] **Step 5: Open the PR**

```bash
gh pr create --base main --title "Technical SEO and performance foundation" --body "..."
```

Include in the body: before/after payload sizes, the AVIF/WebP savings table from Task 4, and the post-deploy checks that still need a public URL (social card validation, Rich Results on the live domain).

---

## Self-review

**Spec coverage:** Social sharing → Tasks 1–2. Structured data → Task 3. CSS backgrounds → Task 4. `<Image>` → Task 5. Orphan deletion → Task 6. Re-baselining → Task 7. Testing/verification → Task 8 plus per-task tests. All spec sections are covered.

**Placeholders:** None. Every code step contains complete, runnable content; the five image filenames, the exact gradient values, and the keep/convert lists are enumerated rather than described.

**Type consistency:** `professionalServiceSchema(origin: string)`, `breadcrumbSchema(origin, crumbs)`, `BUSINESS`, and `Crumb` are defined in Task 3 and used with matching signatures in `BaseLayout`. `ROUTES`, `readDistPage`, `assertDistIsFresh`, `ROOT_DIR` and `findFilesContaining` all match the existing helpers in `tests/unit/lib/`.

**Known ordering constraint:** Task 6 must run after Task 5, because moving the logos into `src/assets/` changes which files are orphans.
