import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const STATIC = resolve(ROOT, 'static');
const SRC = resolve(ROOT, 'src');

/**
 * Regression for the /studio 404 (Sentry JAVASCRIPT-SVELTEKIT-1N / -17 area).
 *
 * The studio toolbar linked `/LOGO%20-Inversed.svg` — one `%20` short of the
 * real filename `LOGO - Inversed.svg` (spaces on BOTH sides of the dash).
 * Five other files encoded it correctly as `%20-%20`; only LeftToolbar.svelte
 * was wrong, so the studio page 404'd on every load and Sentry captured it.
 *
 * Verified live before the fix: broken path -> 404, correct path -> 200.
 *
 * This walks every root-absolute asset reference in src/ and asserts the file
 * actually exists in static/. A typo in any of them fails here instead of in
 * production.
 */

/** Recursively collect source files that can reference static assets. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc);
    } else if (/\.(svelte|ts|js|html)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

// Root-absolute references to a file with an extension: src="/foo/bar.svg".
// Only static-servable extensions — avoids matching API routes or JS imports.
const ASSET_RE = /(?:src|href)=["'](\/[^"'?#>]+\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|json|js))["']/gi;

// Served by SvelteKit/Vite rather than static/, so absence there is expected.
const NOT_IN_STATIC = new Set(['/global.css', '/site.webmanifest', '/manifest.json', '/favicon.ico']);

describe('static asset references resolve to real files', () => {
  const files = sourceFiles(SRC);

  it('scans a non-trivial number of source files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  const missing: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const m of content.matchAll(ASSET_RE)) {
      const ref = m[1];
      if (NOT_IN_STATIC.has(ref)) continue;
      // Percent-decode: the bug was a mis-encoded space, so compare real names.
      let decoded: string;
      try {
        decoded = decodeURIComponent(ref);
      } catch {
        missing.push(`${file.replace(ROOT + '/', '')} -> ${ref} (malformed percent-encoding)`);
        continue;
      }
      if (!existsSync(join(STATIC, decoded))) {
        missing.push(`${file.replace(ROOT + '/', '')} -> ${ref} (decoded: ${decoded})`);
      }
    }
  }

  it('every referenced static asset exists on disk', () => {
    expect(missing, `broken static asset references:\n${missing.join('\n')}`).toEqual([]);
  });
});

describe('the logo filename is encoded consistently everywhere', () => {
  const files = sourceFiles(SRC);
  const logoRefs: Array<{ file: string; ref: string }> = [];

  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/["'](\/LOGO[^"']*\.svg)["']/gi)) {
      logoRefs.push({ file: file.replace(ROOT + '/', ''), ref: m[1] });
    }
  }

  it('finds the logo references', () => {
    expect(logoRefs.length).toBeGreaterThan(0);
  });

  it('no reference uses the truncated "%20-Inversed" spelling', () => {
    const bad = logoRefs.filter(r => /%20-Inversed/i.test(r.ref));
    expect(bad, `truncated logo path: ${bad.map(b => b.file).join(', ')}`).toEqual([]);
  });

  it('every logo reference decodes to a file in static/', () => {
    for (const { file, ref } of logoRefs) {
      const decoded = decodeURIComponent(ref);
      expect(existsSync(join(STATIC, decoded)), `${file} -> ${ref}`).toBe(true);
    }
  });
});
