// Captures full-page baseline screenshots of the LIVE Duda site (https://www.ircoffice.com) for
// the visual regression harness (tests/visual/compare-live.spec.ts). Run this ONCE, before the
// live site is decommissioned — after cutover there is no reference left to diff against.
//
// Usage (from repo root, after `npx playwright install chromium webkit` if browsers aren't
// cached):
//   npx tsc --module es2022 --target es2022 --moduleResolution bundler --esModuleInterop \
//     --skipLibCheck --outDir .tmp-capture-build scripts/capture-live.ts
//   node .tmp-capture-build/capture-live.js
//   rm -rf .tmp-capture-build
//
// (There's no ts-node/tsx in this project's devDependencies, and Node 20 doesn't support
// `--experimental-strip-types`, so the compile step is a manual one-off rather than a checked-in
// `npm run` script tied to a new dependency.)
//
// Writes tests/visual/baseline/<route>-<project>.png, matching the naming that
// tests/visual/compare-live.spec.ts reads via playwright.config.ts's `snapshotPathTemplate`.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  chromium,
  devices,
  webkit,
  type Browser,
  type BrowserContext,
  type BrowserType,
  type Page,
} from 'playwright';

const LIVE_ORIGIN = 'https://www.ircoffice.com';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(SCRIPT_DIR, '..', 'tests', 'visual', 'baseline');

// Live path -> baseline route name. Keep in sync with tests/visual/compare-live.spec.ts.
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

interface ViewportProject {
  readonly name: string;
  readonly device: Record<string, unknown>;
  readonly browserType: BrowserType;
  readonly viewportOverride?: { readonly width: number; readonly height: number };
}

// Mirrors the desktop/tablet/mobile projects in playwright.config.ts, including each device's
// *actual* rendering engine (iPad/iPhone device descriptors default to WebKit, since that's what
// real iOS/iPadOS ships). Baselines must be captured with the same engine the comparison test
// will use, or every tablet/mobile diff would be polluted by a Blink-vs-WebKit rendering
// difference on top of whatever real port defect (or lack thereof) we're trying to measure.
const PROJECTS: ReadonlyArray<ViewportProject> = [
  {
    name: 'desktop',
    device: devices['Desktop Chrome'] as Record<string, unknown>,
    browserType: chromium,
    viewportOverride: { width: 1280, height: 800 },
  },
  {
    name: 'tablet',
    device: devices['iPad (gen 7)'] as Record<string, unknown>,
    browserType: webkit,
  },
  {
    name: 'mobile',
    device: devices['iPhone 13'] as Record<string, unknown>,
    browserType: webkit,
  },
];

// Regions that are known-INTENTIONAL differences from our rebuild (see task-13 brief) and would
// otherwise make every run non-deterministic (carousel autoplay, live map tiles). Selectors here
// are the LIVE site's own DOM (Duda's), not ours — the local comparison test masks the
// equivalent region using our markup's selectors.
const LIVE_MASK_SELECTORS_BY_ROUTE: Readonly<Record<string, readonly string[]>> = {
  // The live homepage carries both the testimonial slider AND a small map widget near the
  // footer (mirrors our own <Map /> in src/pages/index.astro) — both are non-deterministic
  // (autoplay / live tiles) and must be masked.
  home: ['.dmImageSlider', '.mapContainer'],
  contact: ['.mapContainer'],
};

const MASK_COLOR = '#FF00FF';
const SETTLE_TIMEOUT_MS = 4000;
const SCROLL_SETTLE_MS = 500;

async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation-duration: 0s !important; ' +
      'animation-delay: 0s !important; transition-duration: 0s !important; ' +
      'transition-delay: 0s !important; }',
  });
}

// Full-page screenshots of an animated site are non-deterministic. This settles the page the
// same way for every capture: let JS-driven (GSAP / Duda) entrance timelines finish, then scroll
// to the bottom and back to force lazy-loaded images to resolve before shooting.
async function settle(page: Page): Promise<void> {
  await disableAnimations(page);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE_TIMEOUT_MS);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(SCROLL_SETTLE_MS);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(SCROLL_SETTLE_MS);
}

async function captureRoute(
  context: BrowserContext,
  livePath: string,
  routeName: string,
  projectName: string,
): Promise<void> {
  const page = await context.newPage();
  try {
    await page.goto(`${LIVE_ORIGIN}${livePath}`, { waitUntil: 'networkidle', timeout: 60_000 });
    await settle(page);

    const maskSelectors = LIVE_MASK_SELECTORS_BY_ROUTE[routeName] ?? [];
    const mask = maskSelectors.map((selector) => page.locator(selector));

    const outputPath = path.join(OUTPUT_DIR, `${routeName}-${projectName}.png`);
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      mask,
      maskColor: MASK_COLOR,
      animations: 'disabled',
      // expect(page).toHaveScreenshot() defaults to 'css' scale (CSS-pixel dimensions,
      // independent of deviceScaleFactor); the raw page.screenshot() API defaults to 'device'
      // instead. Without this, tablet (DSF 2) and mobile (DSF 3) baselines come out 2x/3x wider
      // and taller than what the comparison test captures, so every pixel is "different" before
      // any real content is even considered.
      scale: 'css',
    });
    console.log(`captured ${outputPath}`);
  } finally {
    await page.close();
  }
}

// Optional argv filter (e.g. `node capture-live.js home contact`) to re-capture a subset of
// routes without re-hitting every page on the live site — useful for a one-off re-shoot after
// fixing a mask selector, without needing the full ~27-capture run again.
function selectRoutes(argv: readonly string[]): ReadonlyArray<readonly [string, string]> {
  const requested = new Set(argv);
  if (requested.size === 0) {
    return ROUTES;
  }
  return ROUTES.filter(([, routeName]) => requested.has(routeName));
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const routes = selectRoutes(process.argv.slice(2));
  // Launch each distinct engine at most once, shared across the projects that need it.
  const browsers = new Map<BrowserType, Browser>();
  try {
    for (const project of PROJECTS) {
      let browser = browsers.get(project.browserType);
      if (!browser) {
        browser = await project.browserType.launch();
        browsers.set(project.browserType, browser);
      }

      const context = await browser.newContext({
        ...project.device,
        ...(project.viewportOverride ? { viewport: project.viewportOverride } : {}),
      });
      try {
        for (const [livePath, routeName] of routes) {
          await captureRoute(context, livePath, routeName, project.name);
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await Promise.all([...browsers.values()].map((browser) => browser.close()));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
