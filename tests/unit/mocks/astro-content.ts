// Test-only stand-in for Astro's `astro:content` virtual module.
//
// The real module is injected by Astro's Vite plugin during `astro dev` / `astro build` /
// `astro check`, so it is unavailable to plain Vitest. This repo's vitest (2.1.9, pinned to
// `vite ^5.0.0`) predates astro@5.18's `vite ^6.4.1` requirement, so `astro/config`'s
// `getViteConfig` helper — the officially documented way to make `astro:content` resolvable in
// Vitest — cannot be used here without bumping the vitest devDependency, which is out of scope
// for this task. `vitest.config.ts` aliases `astro:content` to this file instead.
//
// Mirrors the two exports `src/content.config.ts` actually uses:
// - `z` is Astro's re-export of zod's `z` (see node_modules/astro/dist/content/runtime.js).
// - `defineCollection` is an identity function in real Astro, used only for type inference (see
//   node_modules/astro/dist/content/config.js).
import { z } from 'zod';

export { z };

export function defineCollection<T>(config: T): T {
  return config;
}
