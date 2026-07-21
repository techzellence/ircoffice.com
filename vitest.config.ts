import { defineConfig } from 'vitest/config';

// This repo has no `@types/node`, so path resolution below uses the DOM-lib global `URL`
// (available via the default TS lib) rather than `node:path`/`node:url`, keeping `tsc --noEmit`
// clean without adding a devDependency.
const mockAstroContentPath = new URL('./tests/unit/mocks/astro-content.ts', import.meta.url)
  .pathname;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Astro's `astro:content` virtual module isn't resolvable under plain Vitest — see
      // tests/unit/mocks/astro-content.ts for why and what this stub covers.
      'astro:content': mockAstroContentPath,
    },
  },
});
