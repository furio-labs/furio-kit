#!/usr/bin/env node
// Per-route first-load JS budget for the Next.js App Router build.
//
// Run after `pnpm build`:  pnpm check:budget
//
// For every app route it computes the JS a modern browser downloads on first
// load and compares the gzip total against scripts/bundle-budget.json.
//
// How the chunk list is derived (no HTML needed, so dynamic and auth-gated
// routes are covered too). This mirrors Next's own First Load JS computation
// (next/dist/build/route-bundle-stats.js):
//   1. .next/server/app-paths-manifest.json        → every app path (e.g. /(app)/(interactive)/orders/page)
//   2. .next/server/app/<app path>_client-reference-manifest.js
//        → entryJSFiles: client chunks per segment (layouts, error, page, …); unioned
//   3. .next/build-manifest.json rootMainFiles      → framework/runtime chunks every route loads
//   4. minus build-manifest.json polyfillFiles      → the `noModule` polyfill modern browsers skip
//
// Sizes: gzip level 9 and brotli quality 11 (deterministic, precompressed
// static assets); KB = 1024 bytes.
//
// For routes that were prerendered, the derived chunk list is cross-checked
// against the <script src> tags in the HTML: a manifest chunk the HTML does not
// load fails the check (the model no longer matches Next); extra HTML scripts
// are added to the total. Chunks loaded later by next/dynamic or import() are
// not first-load JS and are not counted (same as Next's own First Load JS).
//
// The script fails closed: a missing build, an unreadable manifest, a route
// with no chunk list or a missing chunk file is an error, not a pass.

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  brotliCompressSync,
  gzipSync,
  constants as zlibConstants,
} from 'node:zlib';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, '.next');
const budgetFile = path.join(root, 'scripts', 'bundle-budget.json');
const KB = 1024;

function fail(message) {
  console.error(`check-bundle-budget: ${message}`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(
      `cannot read ${path.relative(root, file)} (${error.message}). Run \`pnpm build\` first.`
    );
  }
}

if (!existsSync(distDir)) fail('.next/ not found. Run `pnpm build` first.');

const budgets = readJson(budgetFile);
const buildManifest = readJson(path.join(distDir, 'build-manifest.json'));
const appPathsManifest = readJson(
  path.join(distDir, 'server', 'app-paths-manifest.json')
);
const appPathRoutes = readJson(
  path.join(distDir, 'app-path-routes-manifest.json')
);

const polyfills = new Set(buildManifest.polyfillFiles ?? []);
const rootMainFiles = (buildManifest.rootMainFiles ?? []).filter(
  (f) => f.endsWith('.js') && !polyfills.has(f)
);
if (rootMainFiles.length === 0)
  fail(
    'build-manifest.json has no rootMainFiles; the manifest format changed.'
  );

// ── Route group classification ──────────────────────────────────────────────
// `interactive`: any app path under an `(interactive)` route group.
// `read`: everything else — read-only (app) routes, (auth) and top-level pages.
function groupOf(appPath) {
  return appPath.split('/').includes('(interactive)') ? 'interactive' : 'read';
}

// ── Chunk list per app path ─────────────────────────────────────────────────
function readEntryJSFiles(appPath) {
  const file = path.join(
    distDir,
    'server',
    'app',
    `${appPath}_client-reference-manifest.js`
  );
  if (!existsSync(file)) return undefined;
  const previous = globalThis.__RSC_MANIFEST;
  globalThis.__RSC_MANIFEST = undefined;
  try {
    require(file);
    return globalThis.__RSC_MANIFEST?.[appPath]?.entryJSFiles;
  } finally {
    globalThis.__RSC_MANIFEST = previous;
  }
}

const sizeCache = new Map();
function sizesOf(relPath) {
  let sizes = sizeCache.get(relPath);
  if (sizes) return sizes;
  const abs = path.join(distDir, relPath);
  if (!existsSync(abs))
    fail(`chunk ${relPath} is listed in a manifest but missing on disk.`);
  const data = readFileSync(abs);
  sizes = {
    raw: data.length,
    gzip: gzipSync(data, { level: 9 }).length,
    brotli: brotliCompressSync(data, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
  sizeCache.set(relPath, sizes);
  return sizes;
}

// Prerendered HTML lists the scripts the browser actually fetches. Use it as a
// cross-check where it exists (static routes only).
function htmlScripts(route) {
  const name = route === '/' ? 'index' : route.slice(1);
  const file = path.join(distDir, 'server', 'app', `${name}.html`);
  if (!existsSync(file)) return undefined;
  const html = readFileSync(file, 'utf8');
  const scripts = new Set();
  for (const match of html.matchAll(/<script\b([^>]*)>/g)) {
    const attrs = match[1];
    // Match anywhere in src so basePath (/app/_next/…) and assetPrefix
    // (https://cdn…/_next/…) still line up with the manifest paths.
    const src = /\bsrc="[^"]*?\/_next\/(static\/[^"?]+)/.exec(attrs)?.[1];
    if (!src || /\bnomodule\b/i.test(attrs)) continue;
    scripts.add(src.split('?')[0]);
  }
  return scripts;
}

const rows = [];
const errors = [];
for (const appPath of Object.keys(appPathsManifest).sort()) {
  if (!appPath.endsWith('/page')) continue; // route handlers have no client JS
  const route = appPathRoutes[appPath] ?? appPath;
  const entryJSFiles = readEntryJSFiles(appPath);
  if (!entryJSFiles) {
    errors.push(
      `${route}: no entryJSFiles in ${appPath}_client-reference-manifest.js`
    );
    continue;
  }
  const chunks = [
    ...new Set([
      ...Object.values(entryJSFiles)
        .flat()
        .filter((f) => f.endsWith('.js') && !polyfills.has(f)),
      ...rootMainFiles,
    ]),
  ].sort();

  const html = htmlScripts(route);
  if (html) {
    // A manifest chunk the HTML doesn't load means this script's model of the
    // build is wrong: fail. Extra HTML scripts are real downloads: count them.
    const missing = chunks.filter((c) => !html.has(c));
    if (missing.length) {
      errors.push(
        `${route}: manifest chunks not loaded by the prerendered HTML (${missing.join(', ')}); ` +
          'the Next.js build output format may have changed'
      );
    }
    for (const c of html) if (!chunks.includes(c)) chunks.push(c);
  }

  const totals = { raw: 0, gzip: 0, brotli: 0 };
  for (const chunk of chunks) {
    const s = sizesOf(chunk);
    totals.raw += s.raw;
    totals.gzip += s.gzip;
    totals.brotli += s.brotli;
  }

  const group = groupOf(appPath);
  const override = budgets.routes?.[route];
  const budgetKb = override?.gzipKb ?? budgets.groups?.[group]?.gzipKb;
  if (typeof budgetKb !== 'number') {
    errors.push(
      `${route}: no budget for group "${group}" in scripts/bundle-budget.json`
    );
    continue;
  }
  rows.push({
    route,
    group,
    chunks,
    ...totals,
    budgetKb,
    overridden: Boolean(override),
    verified: Boolean(html),
    ok: totals.gzip <= budgetKb * KB,
  });
}

for (const route of Object.keys(budgets.routes ?? {})) {
  if (!rows.some((r) => r.route === route)) {
    errors.push(
      `override for ${route} in scripts/bundle-budget.json matches no route; remove it`
    );
  }
}

if (rows.length === 0)
  errors.push(
    'no app routes measured; the build output format may have changed'
  );

// ── Report ──────────────────────────────────────────────────────────────────
const kb = (bytes) => (bytes / KB).toFixed(1);

const shared = new Set(
  rows.length
    ? rows[0].chunks.filter((c) => rows.every((r) => r.chunks.includes(c)))
    : []
);
const floor = { gzip: 0, brotli: 0 };
for (const chunk of shared) {
  floor.gzip += sizesOf(chunk).gzip;
  floor.brotli += sizesOf(chunk).brotli;
}

const header = [
  'Route',
  'Group',
  'gzip KB',
  'brotli KB',
  'Budget KB',
  'Status',
];
const table = rows
  .sort((a, b) => a.route.localeCompare(b.route))
  .map((r) => [
    r.route,
    r.group,
    kb(r.gzip),
    kb(r.brotli),
    `${r.budgetKb}${r.overridden ? '*' : ''}`,
    r.ok ? 'ok' : `OVER by ${kb(r.gzip - r.budgetKb * KB)}`,
  ]);
const widths = header.map((h, i) =>
  Math.max(h.length, ...table.map((row) => row[i].length))
);
const line = (cells) =>
  cells
    .map((c, i) =>
      i >= 2 && i <= 4 ? c.padStart(widths[i]) : c.padEnd(widths[i])
    )
    .join('  ');

console.log(
  'First-load JS per route (modern browsers; noModule polyfill excluded; KB = 1024 bytes)\n'
);
console.log(line(header));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const row of table) console.log(line(row));
console.log(
  `\nShared framework floor (${shared.size} chunks loaded by every route): ` +
    `${kb(floor.gzip)} KB gzip / ${kb(floor.brotli)} KB brotli`
);
if (rows.some((r) => r.overridden))
  console.log('* per-route override in scripts/bundle-budget.json');
const unverified = rows.filter((r) => !r.verified).map((r) => r.route);
if (unverified.length)
  console.log(
    `Dynamic (no prerendered HTML, manifest only): ${unverified.join(', ')}`
  );

if (errors.length) {
  console.error('\nErrors:');
  for (const e of errors) console.error(`  - ${e}`);
}
const breaches = rows.filter((r) => !r.ok);
if (breaches.length) {
  console.error(
    `\n${breaches.length} route(s) over budget: ${breaches.map((r) => r.route).join(', ')}.\n` +
      'Reduce the client JS (push "use client" deeper, lazy-load heavy widgets) or, if the growth is ' +
      'intended, raise the budget in scripts/bundle-budget.json with a reason.'
  );
}
if (errors.length || breaches.length) process.exit(1);
console.log('\nAll routes within budget.');
