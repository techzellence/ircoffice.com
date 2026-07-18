import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm run build && npx wrangler pages dev dist --port 8788',
    url: 'http://localhost:8788',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:8788',
  },
  // Baselines are pre-captured from the live site by scripts/capture-live.ts, not by
  // `--update-snapshots`, so the path must be pinned to the exact `<route>-<project>.png`
  // names that script writes, independent of platform/browser.
  snapshotPathTemplate: 'tests/visual/baseline/{arg}{ext}',
  projects: [
    // Existing E2E suite (tests/e2e/): unchanged, runs once under a single desktop project.
    {
      name: 'chromium',
      testMatch: '**/e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Task 13: visual regression against the live site (tests/visual/), one project per
    // viewport. Scoped via testMatch so these never pick up tests/e2e/ and vice versa —
    // the E2E suite must keep running exactly once, not three times.
    {
      name: 'desktop',
      testMatch: '**/visual/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet',
      testMatch: '**/visual/**/*.spec.ts',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'mobile',
      testMatch: '**/visual/**/*.spec.ts',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
