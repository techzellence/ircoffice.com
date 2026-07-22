# ircoffice.com — technical SEO & performance foundation

**Date:** 2026-07-22
**Status:** Approved
**Author:** Mohamed H (with Claude)
**Follows:** `2026-07-17-ircoffice-migration-design.md` (migration, merged as PR #2)

## Purpose

The Duda migration is merged and `main` builds clean. This is the first of several
follow-on projects. It builds the technical foundation that later content work sits
on: social sharing, structured data, and image performance.

Sequenced first deliberately. Publishing blog posts before social cards and schema
exist wastes their reach — every share renders as a bare URL, and Google has no
machine-readable description of the business to attach them to.

## Scope

This project is **technical only**. It needs no client input and makes no content
claims. Content depth (blog, FAQs), conversion work, and the accessibility audit are
separate projects, deliberately not bundled here.

## Audit findings

Measured against `main` at `342ad9b`.

| # | Finding | Evidence | Impact |
|---|---|---|---|
| 1 | No Open Graph or Twitter tags | `BaseLayout.astro` emits `canonical` only | Every shared link renders as a bare URL — no title, image, or description |
| 2 | No structured data | No `ld+json` anywhere in `src/` | Google has no machine-readable record of the business; largest local-SEO gap |
| 3 | 95 of 113 images unreferenced | 9.1 MB of Duda stock (sparklers, VR glasses, holiday backgrounds) | Repo and deploy bloat |
| 4 | Referenced images unoptimized | No AVIF/WebP, no `srcset`, no intrinsic dimensions | Slow mobile loads; layout shift (a Core Web Vitals factor) |
| 5 | Visual baselines knowingly stale | `tests/visual/` compares against live Duda | Suite fails by design since the brand/copy diverged, so nobody reads it |

### Where the image weight actually is

This inverted the initial recommendation and is the reason the plan below leads with
CSS rather than `<Image>`:

| Referenced from | Weight | Optimized by Astro `<Image>`? |
|---|---|---|
| `<img>` in components | 131 KB | Yes |
| CSS `background-image` | **1,487 KB** | **No** |

**91% of image weight is in CSS backgrounds** — the four hero images in
`public/css/style.css` are 293 KB, 269 KB, 306 KB and 379 KB. What sits in `<img>`
tags is logos and icons, 23 KB of which (favicon, Leaflet markers) should not be
converted at all.

Optimizing only `<img>` would mean substantial markup churn for ~100 KB while 1.45 MB
went untouched.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Schema type | `ProfessionalService` | **Not `LegalService`** — that type asserts a legal-services provider, the exact claim a non-attorney practice must not make. Consistent with the UPL constraints on the copy |
| OG image | One branded 1200×630 card, site-wide | Legible at WhatsApp thumbnail size; no per-page asset maintenance |
| OG image generation | SVG rasterized with `sharp` | `sharp` is already an Astro dependency — no new deps, no external service, deterministic |
| Image order | CSS backgrounds first, then `<Image>` | Captures 91% of the weight before touching markup |
| `sameAs` in schema | Omit until real URLs exist | Pointing it at placeholder profiles is worse than omitting it |
| Visual tests | Re-baseline against current build | The live-Duda comparison served the cutover; the site has since deliberately diverged |

## Design

### 1. Social sharing

`BaseLayout` gains Open Graph and Twitter Card meta derived from the `title` and
`description` props every page already passes, with optional per-page overrides.

Requirements:

- `og:image` must be an **absolute** URL. Relative paths silently fail on most
  scrapers, which is the usual cause of "it works in the validator but not in
  WhatsApp".
- `og:type` is `website` for the home page and `article` for blog posts.
- `twitter:card` is `summary_large_image`.
- `og:locale` is `en_US`.

The card asset: 1200×630 PNG at `public/og-card.png`, authored as SVG and rasterized
by a committed script so it can be regenerated rather than hand-edited. Navy
background (`#174171`), the IRC logo, the business name, and
"Immigration & Travel Services · Minneapolis".

### 2. Structured data

A single `ProfessionalService` JSON-LD block emitted site-wide from `BaseLayout`,
plus `BreadcrumbList` on inner pages.

Values, all of which already appear on the site and must continue to match it
exactly:

- **name** Immigrant Resource Center
- **telephone** (612) 822-5747
- **address** 1 W Lake St Ste #165, Minneapolis, MN 55408, US
- **geo** 44.948306738076035, -93.27877182892344
- **hours** Mo–Fr 09:00–18:00, Sa 10:00–17:00
- **foundingDate** 1999
- **url / image** absolute

**NAP consistency is the point.** Name, address and phone must be byte-identical
across the schema, the rendered page, and the client's Google Business Profile.
Mismatches actively harm local ranking, so these are sourced from the rendered
markup rather than retyped.

### 3. Image optimization — CSS backgrounds first

The 1.45 MB of hero art in `public/css/style.css` is converted to AVIF + WebP with
the original JPEG retained as a fallback, served via `image-set()`.

- Generate `.avif` and `.webp` next to each source file with a committed script
  (sharp), so the conversion is reproducible and reviewable.
- Rewrite each `background-image: url(...)` to `image-set()` with the JPEG last.
  Browsers without `image-set()` support fall back to the plain `url()` declaration
  that precedes it.
- `style.css` is minified and is the file most likely to cause visual regressions —
  every page that uses a converted background gets rendered and compared.

### 4. Image optimization — `<img>` → Astro `<Image>`

After the CSS work lands and is verified.

- Move the logo images (`company-logo.jpeg`, `logo.jpeg`, `logo-640w.jpeg`,
  `Divider-Decorative_01.png`) from `public/img/` to `src/assets/img/`.
- Convert their `<img>` tags to `<Image>`, which emits AVIF/WebP, `srcset`, and
  intrinsic `width`/`height`. The dimensions are what eliminate layout shift.
- **Explicitly not converted:** `favicon.ico` (referenced from `<head>`),
  Leaflet's `marker-icon*.png` / `marker-shadow.png` (fetched by JS at runtime, so
  they must keep stable public paths), and `gmail-icon.png` / `dropdown-small.png`
  (already under 1 KB — conversion overhead exceeds any saving).

### 5. Delete orphaned images

95 files, 9.1 MB, none referenced. Git history retains them, so this is reversible.

Before deleting, each file is re-verified as unreferenced across `src/`,
`public/css/`, `public/_headers`, `public/_redirects`, `src/content/`, and
`astro.config.mjs` — not only `src/`.

Honest framing: this speeds up **builds, clones and deploys**. It does not speed up
page loads, because browsers never request unreferenced files.

### 6. Re-baseline the visual regression suite

`tests/visual/compare-live.spec.ts` currently diffs against screenshots of the live
Duda site. The site has since diverged **on purpose**: darker brand orange (WCAG AA),
COVID banners removed, copy rewritten. The suite therefore fails by design.

It is converted from "match Duda" to "do not regress from current known-good", with
baselines regenerated from the current build. The Duda baselines are kept in git
history as the record of cutover fidelity.

## Testing

| Layer | Approach |
|---|---|
| Social tags | Tripwire: every built page has `og:title`, `og:description`, `og:image` (absolute), `og:url`, `twitter:card` |
| Structured data | Tripwire: every page emits parseable `ProfessionalService` JSON-LD; assert NAP fields match the rendered page |
| Images | Assert built CSS references `.avif`/`.webp`; assert no `<img>` in converted components lacks `width`/`height` |
| Weight | Before/after `dist/` size recorded in the task report |
| Visual | Playwright, current-build baselines, all 9 routes × 3 viewports |
| Regression | Existing suites stay green: 81 unit, 10 E2E, `tsc` clean |

The tripwires matter most: OG tags and JSON-LD are invisible in normal use, so
nothing else would catch a future refactor silently dropping them.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `image-set()` rewrite breaks hero rendering | High | JPEG fallback retained; every affected page rendered and compared before commit |
| Deleting an image that IS referenced | Medium | Re-verify across all config/content/CSS, not just `src/`; git retains history |
| NAP drifts from Google Business Profile | Medium | Sourced from rendered markup; flagged for client verification against GBP |
| `<Image>` conversion shifts layout | Medium | Done after CSS work, verified separately; intrinsic dimensions should *reduce* shift |
| OG image unreadable at thumbnail size | Low | Checked at rendered thumbnail scale, not just full size |

## Out of scope

- Blog posts, FAQ content, page copy depth (separate content project)
- Conversion/trust work — CTAs, testimonials (needs client input)
- Full accessibility audit beyond the contrast work already done
- Real social profile URLs (`sameAs`) — blocked on the client
- `sitemap`/`robots.txt` — already shipped and correct

## Deferred, with reasons

- **Brand-colour contrast** already fixed to WCAG AA in a prior commit.
- **CSS `image-set()` for the `30-years` and `paper_cut_bg` PNGs** — 30 KB and 11 KB
  respectively; below the threshold where conversion earns its complexity.
