// Visual regression against the LIVE Duda site. Baselines were captured once, before cutover,
// by scripts/capture-live.ts (see tests/visual/baseline/ and .superpowers/sdd/task-13-report.md
// for the full triage). This test re-captures the same routes against the local build and
// compares against those frozen baselines.
//
// The TRUE pixel-match targets are the 5 ported pages (home, green-card, visa, citizenship,
// contact minus its map) — those assert for real at a 2% tolerance (fonts/AA/timing never go to
// 0%). /about, /umra, /privacy, /blog are DRAFTED/rebuilt content (Task 10/11) with no live
// equivalent worth matching pixel-for-pixel; they're captured and diffed for the record via
// `test.fail()` (expected to differ) rather than silently skipped or forced green.
import { expect, test } from '@playwright/test';

// Local path -> baseline route name. Keep in sync with scripts/capture-live.ts.
const ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['/', 'home'],
  ['/green-card', 'green-card'],
  ['/visa', 'visa'],
  ['/citizenship', 'citizenship'],
  ['/contact', 'contact'],
  ['/about', 'about'],
  ['/umra', 'umra'],
  ['/privacy', 'privacy'],
  ['/blog', 'blog'],
];

// The 5 ported pages the brief calls the true pixel-match targets.
const PORTED_ROUTES = new Set(['home', 'green-card', 'visa', 'citizenship', 'contact']);

// Regions that are known-INTENTIONAL differences from the live site (see task-13 brief /
// report) and would otherwise make the diff non-deterministic run-to-run. Selectors are OUR
// markup's own classes — the live-side capture masks the equivalent live DOM region.
const LOCAL_MASK_SELECTORS_BY_ROUTE: Readonly<Record<string, readonly string[]>> = {
  // Swiper testimonial carousel (autoplay) + the Leaflet/OSM map (replaces live's map widget).
  home: ['.swiper-container', '.map__wrapper'],
  // Leaflet/OSM map (replaces live's Google/Mapbox map — deliberate, see task-13 report).
  contact: ['.map__wrapper'],
};

const MASK_COLOR = '#FF00FF';
const SETTLE_TIMEOUT_MS = 4000;
const SCROLL_SETTLE_MS = 500;
const PORTED_MAX_DIFF_PIXEL_RATIO = 0.02;

for (const [routePath, routeName] of ROUTES) {
  const isPorted = PORTED_ROUTES.has(routeName);

  test(`${routeName} matches the live baseline`, async ({ page }, testInfo) => {
    if (!isPorted) {
      // /about, /umra, /privacy, /blog are expected to differ substantially from the live
      // snapshot by design (see file header). Recording as an expected failure keeps the diff
      // ratio visible in the report without either forcing a pass or silently skipping.
      test.fail(
        true,
        'known-intentional content difference (drafted/rebuilt page, not a pixel-match target)',
      );
    }

    await page.goto(routePath, { waitUntil: 'networkidle' });

    // Same determinism recipe used to capture the baselines: neutralize CSS transitions/
    // animations, wait for fonts and JS-driven (GSAP) entrance timelines to settle, then scroll
    // to the bottom and back so lazy-loaded images resolve before the shot.
    await page.addStyleTag({
      content:
        '*, *::before, *::after { animation-duration: 0s !important; ' +
        'animation-delay: 0s !important; transition-duration: 0s !important; ' +
        'transition-delay: 0s !important; }',
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(SETTLE_TIMEOUT_MS);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(SCROLL_SETTLE_MS);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(SCROLL_SETTLE_MS);

    const maskSelectors = LOCAL_MASK_SELECTORS_BY_ROUTE[routeName] ?? [];
    const mask = maskSelectors.map((selector) => page.locator(selector));

    await expect(page).toHaveScreenshot(`${routeName}-${testInfo.project.name}.png`, {
      fullPage: true,
      mask,
      maskColor: MASK_COLOR,
      animations: 'disabled',
      maxDiffPixelRatio: isPorted ? PORTED_MAX_DIFF_PIXEL_RATIO : undefined,
    });
  });
}
