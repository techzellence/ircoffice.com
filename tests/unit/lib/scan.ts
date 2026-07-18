// Recursive plain-text/byte scanning helpers used by the migration tripwires
// (tests/unit/tripwires.test.ts). Deliberately dependency-free grep-alikes: these tests exist to
// catch a handful of specific strings reappearing anywhere under a directory, not to parse
// anything.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { ROOT_DIR } from './dist';

function listFiles(absDir: string): string[] {
  if (!existsSync(absDir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Finds every file under the given repo-relative directories that contains `needle` as a raw
 * byte sequence (checked on the file's Buffer, so binary files can't dodge a plain-ASCII needle
 * via encoding weirdness). Returns paths relative to the repo root for readable assertion
 * failures.
 */
export function findFilesContaining(dirs: readonly string[], needle: string): string[] {
  const hits: string[] = [];
  for (const dir of dirs) {
    const absDir = path.join(ROOT_DIR, dir);
    for (const file of listFiles(absDir)) {
      const buffer = readFileSync(file);
      if (buffer.includes(needle)) {
        hits.push(path.relative(ROOT_DIR, file));
      }
    }
  }
  return hits;
}
