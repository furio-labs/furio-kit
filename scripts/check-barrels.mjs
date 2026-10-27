#!/usr/bin/env node
// Every FSD slice must expose its public API through an index.ts barrel.
// dependency-cruiser checks imports, not missing files, so this runs beside it.
//
//   node scripts/check-barrels.mjs   (CI: .github/workflows/architecture-guard.yml)

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLICED_LAYERS = ['entities', 'features', 'widgets', 'views'];

const missing = [];
for (const layer of SLICED_LAYERS) {
  const layerDir = path.join(root, 'src', layer);
  if (!existsSync(layerDir)) continue;
  for (const entry of readdirSync(layerDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slice = path.join(layerDir, entry.name);
    if (
      !existsSync(path.join(slice, 'index.ts')) &&
      !existsSync(path.join(slice, 'index.tsx'))
    ) {
      missing.push(path.relative(root, slice));
    }
  }
}

if (missing.length) {
  console.error('Missing barrel (index.ts) in:');
  for (const slice of missing) console.error(`  - ${slice}/`);
  console.error('\nEvery slice must re-export its public API from index.ts.');
  process.exit(1);
}
console.log('✔ every slice has an index.ts barrel');
