// Import-graph architecture rules for furio-kit, enforced by `pnpm check:arch`
// (dependency-cruiser, MIT). Runs in CI (.github/workflows/architecture-guard.yml).
//
// Because the rules work on the resolved import graph, they see every form of
// import: `@/…` aliases, relative `../` paths, `#ui-kit` subpath imports,
// dynamic `import()`, `export … from`, `require()` and type-only imports.
//
// FSD layers, lowest to highest: shared < entities < features < widgets < views < app.
// A layer may only import from layers below it. `app/` may import any layer.
//
// Adding a rule: see docs/wiki/09-extending.md.

const fs = require('node:fs');
const path = require('node:path');

/**
 * dependency-cruiser needs a TypeScript-capable parser. Its `tsc` parser only
 * supports typescript < 7 (this repo is on 7, which has no JS compiler API yet),
 * so it uses `@swc/core` (Apache-2.0) via `parser: 'swc'`.
 *
 * Without it, depcruise silently skips every .ts/.tsx file and reports
 * "no violations" for a graph it never built. Fail loudly instead.
 *
 * @returns {'swc'}
 */
function swcParser() {
  const fail = (why) => {
    throw new Error(
      `check:arch: dependency-cruiser cannot parse TypeScript: ${why}. ` +
        'Without @swc/core@^1 every .ts/.tsx file would be skipped silently. ' +
        'Add "@swc/core": "^1" to devDependencies.'
    );
  };
  let dir;
  try {
    dir = path.dirname(require.resolve('@swc/core'));
  } catch {
    fail('@swc/core is not installed');
  }
  // Walk up from the entry point to the package root; don't rely on the
  // package exporting ./package.json.
  for (; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const manifest = path.join(dir, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const { name, version } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (name !== '@swc/core') continue;
    if (version.split('.')[0] !== '1')
      fail(`@swc/core ${version} is installed`);
    return 'swc';
  }
  fail('@swc/core has no package.json');
}

/** Sliced FSD layers: each direct subdirectory is a slice with a public index.ts. */
const SLICED = '(entities|features|widgets|views)';

/** Everything that is never part of the runtime graph. */
const NOT_RUNTIME = ['\\.test\\.tsx?$', '\\.d\\.ts$'];

/** @param {string} layer @param {string[]} higher @returns {import('dependency-cruiser').IForbiddenRuleType} */
const layerRule = (layer, higher) => ({
  name: `fsd-layer-${layer}`,
  severity: 'error',
  comment:
    `src/${layer} may only import from lower FSD layers. ` +
    `It must not import from ${higher.join(', ')}.`,
  from: { path: `^src/${layer}/` },
  to: {
    path: [
      ...higher.filter((h) => h !== 'app').map((h) => `^src/${h}/`),
      // app/ and the root entry files sit above every src layer
      '^app/',
      '^(proxy|instrumentation)\\.ts$',
    ],
  },
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ── FSD layer direction ────────────────────────────────────────────────
    layerRule('shared', ['entities', 'features', 'widgets', 'views', 'app']),
    layerRule('entities', ['features', 'widgets', 'views', 'app']),
    layerRule('features', ['widgets', 'views', 'app']),
    layerRule('widgets', ['views', 'app']),
    layerRule('views', ['app']),

    // ── Slice isolation ────────────────────────────────────────────────────
    {
      name: 'fsd-no-cross-slice',
      severity: 'error',
      comment:
        'Slices on the same layer must not import each other ' +
        '(e.g. features/cart → features/auth). Move shared code down a layer.',
      from: { path: `^src/${SLICED}/([^/]+)/` },
      to: { path: '^src/$1/', pathNot: '^src/$1/$2/' },
    },
    {
      name: 'fsd-public-api-from-slice',
      severity: 'error',
      comment:
        'Import another slice through its public index.ts (`@/entities/user`), not its internals ' +
        '(`@/entities/user/api/get-users`).',
      from: { path: `^(src/${SLICED}/[^/]+/)` },
      to: {
        path: `^src/${SLICED}/[^/]+/`,
        pathNot: ['^$1', `^src/${SLICED}/[^/]+/index\\.tsx?$`],
      },
    },
    {
      name: 'fsd-public-api',
      severity: 'error',
      comment:
        'Import a slice through its public index.ts (`@/views/home`), not its internals ' +
        '(`@/views/home/ui/HomePage`).',
      from: { pathNot: `^src/${SLICED}/` },
      to: {
        path: `^src/${SLICED}/[^/]+/`,
        pathNot: `^src/${SLICED}/[^/]+/index\\.tsx?$`,
      },
    },

    // ── Design system boundary ─────────────────────────────────────────────
    {
      name: 'ui-kit-package-only-in-kit',
      severity: 'error',
      comment:
        '@org/ui-kit may only be imported by a kit binding under src/shared/ui/kit/. ' +
        'Everything else consumes adapters from @/shared/ui.',
      from: { pathNot: '^src/shared/ui/kit/' },
      to: { path: ['^@org/ui-kit($|/)', '(^|/)node_modules/@org/ui-kit/'] },
    },
    {
      name: 'ui-kit-alias-only-in-shared-ui',
      severity: 'error',
      comment:
        'The #ui-kit primitives (src/shared/ui/kit/**) may only be imported by adapters in ' +
        'src/shared/ui/. Everything else imports adapters from @/shared/ui.',
      from: { pathNot: '^src/shared/ui/' },
      to: { path: ['^#ui-kit($|/)', '^src/shared/ui/kit/'] },
    },

    // ── Server / client boundary ───────────────────────────────────────────
    {
      name: 'auth-server-not-from-client',
      severity: 'error',
      comment:
        'src/shared/auth/server.ts is server-only. It must not be reachable from ' +
        'src/shared/auth/client.ts or from any UI adapter in src/shared/ui/.',
      from: { path: ['^src/shared/auth/client\\.tsx?$', '^src/shared/ui/'] },
      to: { path: '^src/shared/auth/server\\.tsx?$', reachable: true },
    },

    // ── Graph hygiene ──────────────────────────────────────────────────────
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular imports break module initialisation order and RSC boundaries.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment:
        'Every import must resolve. This also keeps the other rules honest: an alias that ' +
        'stops resolving would otherwise hide its imports from every path-based rule.',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'not-to-test',
      severity: 'error',
      comment: 'Runtime code must not import test files.',
      from: { pathNot: NOT_RUNTIME },
      to: { path: NOT_RUNTIME[0] },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        'Module not imported by anything. Remove it, or ignore this if it is intentional.',
      from: {
        orphan: true,
        pathNot: [
          ...NOT_RUNTIME,
          '^app/', // route files are entry points, found by the Next.js router
          '^(proxy|instrumentation)\\.ts$',
        ],
      },
      to: {},
    },
  ],
  options: {
    parser: swcParser(),
    doNotFollow: { path: ['node_modules'] },
    exclude: { path: ['^\\.next/', '^node_modules/'] },
    // Keep type-only imports in the graph: `import type` across layers is still a violation.
    tsPreCompilationDeps: true,
    // Resolves the `@/*` path alias.
    tsConfig: { fileName: 'tsconfig.json' },
    // `#ui-kit` resolves through package.json "imports" (enhanced-resolve's default importsFields).
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.json',
        '.d.ts',
      ],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    skipAnalysisNotInRules: true,
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
