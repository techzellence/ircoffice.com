import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e/**/*.spec.ts',
  webServer: {
    command: 'npm run build && npx wrangler pages dev dist --port 8788',
    url: 'http://localhost:8788',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:8788',
  },
  projects: [
    // Task 13 extends this with tablet/mobile viewport projects.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
