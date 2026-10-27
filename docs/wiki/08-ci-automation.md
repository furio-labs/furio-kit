# CI and Automation

This page documents every automated check and hook in furio-kit. Come here when a workflow fails or you need to understand what runs and why.

---

## 1. GitHub Actions overview

Seven workflows run in `.github/workflows/`.

| Workflow | File | Trigger | What it does | Blocks merge? |
|---|---|---|---|---|
| CI | `ci.yml` | push/PR to `main` | TypeScript typecheck (`tsc --noEmit`), Biome lint, Vitest test suite, **production build** (`pnpm build`), **per-route JS budget** (`pnpm check:budget`, Node 24 leg) | Yes |
| Audit | `audit.yml` | push/PR to `main`, weekly Monday 08:00 UTC | `pnpm audit --audit-level=high` | Yes |
| CodeQL | `codeql.yml` | push/PR to `main`, weekly Monday 08:00 UTC | GitHub CodeQL security analysis (JavaScript/TypeScript) | Yes |
| Architecture Guard | `architecture-guard.yml` | PR to `main` | Import-graph rules via dependency-cruiser (`pnpm check:arch`): FSD layers, slice isolation, public APIs, UI kit and server-only boundaries, cycles; barrel exports | Yes |
| Dependabot Auto-Merge | `dependabot-auto.yml` | Any Dependabot PR | Auto-merges patch/minor, labels major for review | No (enables auto-merge) |
| Stale | `stale.yml` | Daily 06:00 UTC | Labels PRs/issues inactive for 14 days, closes after 7 more | N/A |
| Release Please | `release-please.yml` | push to `main` | Opens/updates a Release PR that bumps `package.json` version and updates `CHANGELOG.md`; merging the PR creates a GitHub Release and tag | No |

---

## 2. What blocks merge

A merge to `main` is blocked if any of the following fail:

- **TypeScript errors** — `tsc --noEmit` exits non-zero (`ci.yml`)
- **Lint failures** — Biome reports errors (`ci.yml`)
- **Test failures** — any Vitest test fails or a test suite errors out (`ci.yml`)
- **Build failures** — `pnpm build` exits non-zero; catches runtime import errors and missing env var issues that TypeScript alone cannot detect (`ci.yml`)
- **JS budget breaches** — a route's first-load JS exceeds its budget in `scripts/bundle-budget.json` (`ci.yml`, see [JS budget](#js-budget))
- **High or critical vulnerabilities** — `pnpm audit --audit-level=high` finds a matching advisory (`audit.yml`)
- **CodeQL findings** — GitHub's semantic analysis flags a security issue (`codeql.yml`)
- **FSD violations** — a layer imports from above itself, or a slice imports from a peer slice (`architecture-guard.yml`)
- **Design system boundary violations** — `@org/ui-kit` imported outside `src/shared/ui/kit/`, or `#ui-kit` imported outside `src/shared/ui/` (`architecture-guard.yml`)
- **Server-only leaks** — `src/shared/auth/server.ts` reachable from `src/shared/auth/client.ts` or a UI adapter (`architecture-guard.yml`)
- **Deep imports** — code outside a slice imports its internals instead of its `index.ts` (`architecture-guard.yml`)
- **Circular or unresolvable imports** (`architecture-guard.yml`)
- **Missing barrel exports** — a slice under `entities/`, `features/`, `widgets/` or `views/` has no `index.ts` (`architecture-guard.yml`)

Stale and Dependabot Auto-Merge do not block merge.

---

## 3. Architecture Guard details

`architecture-guard.yml` runs on every PR to `main`. It installs dependencies, runs two checks, and posts a PR comment that it updates on later pushes, so the comment always shows the current state.

### Check 1: Import graph (`pnpm check:arch`)

[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) (MIT) resolves every import in `src/`, `app/`, `proxy.ts` and `instrumentation.ts` and validates the graph against the rules in `.dependency-cruiser.cjs`. Because it checks the **resolved** graph rather than grepping source text, it sees all of these forms:

- `@/…` path aliases (via `tsconfig.json`) and relative `../` paths
- the `#ui-kit` subpath import (via `package.json` `"imports"`)
- dynamic `import()`, `export … from`, `require()` and `import type`

The grep-based checks this replaced only matched `from '@/…'`, so relative paths, dynamic imports and re-exports went unchecked, and `app/` was never checked at all.

| Rule | Fails when |
|---|---|
| `fsd-layer-<layer>` | A layer imports from a higher one. Order: `shared < entities < features < widgets < views < app`. `src/**` must not import `app/`, `proxy.ts` or `instrumentation.ts`. `app/` may import any layer. |
| `fsd-no-cross-slice` | A slice imports another slice on the same layer (`features/cart` → `features/auth`). |
| `fsd-public-api-from-slice` / `fsd-public-api` | Code outside a slice imports its internals (`@/entities/user/api/get-users`) instead of its `index.ts` (`@/entities/user`). Applies to `app/` too. A slice's own files can import each other freely. |
| `ui-kit-package-only-in-kit` | `@org/ui-kit` is imported outside a kit binding in `src/shared/ui/kit/`. |
| `ui-kit-alias-only-in-shared-ui` | `#ui-kit`, or any file under `src/shared/ui/kit/`, is imported from outside `src/shared/ui/`. |
| `auth-server-not-from-client` | `src/shared/auth/server.ts` is reachable, directly or transitively, from `src/shared/auth/client.ts` or from any adapter in `src/shared/ui/`. |
| `no-circular` | Two or more modules import each other in a cycle. |
| `not-to-unresolvable` | An import doesn't resolve. This also guards the other rules: if an alias stopped resolving, its imports would silently drop out of every path-based rule. |
| `not-to-test` | Runtime code imports a `*.test.ts(x)` file. |
| `no-orphans` (warning) | A module in `src/` is imported by nothing. Warnings don't fail the check. Route files in `app/`, the root entry files, tests and `.d.ts` files are excluded. |

Run it locally with `pnpm check:arch`. For a graph of a single folder, run `pnpm exec depcruise src/features --config .dependency-cruiser.cjs --output-type text`.

> **Parser requirement.** dependency-cruiser parses TypeScript with `@swc/core` (`parser: 'swc'`). Its `tsc` parser only supports `typescript` below 7, and this repo uses 7. If no TypeScript-capable parser is installed, `.dependency-cruiser.cjs` throws instead of letting dependency-cruiser skip every `.ts`/`.tsx` file and report a false "no violations".

### Check 2: Barrel exports (`node scripts/check-barrels.mjs`)

Every slice directory under `entities/`, `features/`, `widgets/` and `views/` must contain an `index.ts`. dependency-cruiser checks imports, not missing files, so a small script handles this check.

### Removed: UI kit connection guard

The former Check 5 (`ENFORCE_UI_KIT_CONNECTED`, which scanned for the "adapter is not connected" stub) is gone. Adapters now import primitives through the `#ui-kit` subpath import, which resolves at build time to a real kit. An unwired kit fails `pnpm build` and `not-to-unresolvable`, so no runtime stub or opt-in check is needed. You can delete the `ENFORCE_UI_KIT_CONNECTED` repository variable if you set it.

### Reading the PR comment

```
## Architecture Guard

One or more architecture checks failed. Please review the violations below.

### ❌ Import graph: FSD layers, slice isolation, public APIs, UI kit and server-only boundaries, cycles (`pnpm check:arch`)

  error fsd-public-api-from-slice: src/features/auth/ui/LoginForm.tsx → src/entities/user/api/get-users.ts
    Import another slice through its public index.ts (`@/entities/user`), not its internals …

### ✅ Barrel exports (`index.ts` required for every slice)
```

Each violation names the rule, the importing file and the resolved target, followed by the rule's explanation.

### What to do when it fails

1. Read the rule name and the `from → to` pair in the PR comment or the job log.
2. `fsd-layer-*`: move the shared code down a layer, or restructure so the dependency flows downward.
3. `fsd-no-cross-slice`: move the shared part into a lower layer (often `entities` or `shared`), or compose the two slices in a higher layer.
4. `fsd-public-api*`: export what you need from the slice's `index.ts` and import the slice root.
5. `ui-kit-*`: add or extend an adapter in `src/shared/ui/<Component>/` and import it from `@/shared/ui`.
6. `auth-server-not-from-client`: keep server-only code behind Server Components or Server Actions. Pass data down as props.
7. Missing barrel: create `src/<layer>/<slice>/index.ts` and export the slice's public surface.
8. Push the fix. The guard re-runs automatically and updates the comment.

---

## JS budget

`ci.yml` runs `pnpm check:budget` after the build, on the Node 24 leg only, because the bundle doesn't depend on the Node version. Next 16 no longer prints route sizes in the build output, so without this step nothing catches client JS growth.

For every app route, `scripts/check-bundle-budget.mjs` computes the JS a modern browser downloads on first load. It reads the build manifests in `.next/`, which also covers dynamic and auth-gated routes that have no prerendered HTML:

- the client chunks of every segment on the route (layouts, `error.tsx`, the page), taken from `entryJSFiles` in `.next/server/app/<route>/page_client-reference-manifest.js`;
- plus the framework and runtime chunks every route loads (`rootMainFiles` in `.next/build-manifest.json`);
- minus the `noModule` polyfill chunk (`polyfillFiles`), which modern browsers skip.

Each chunk is gzipped at level 9 and brotli-compressed at quality 11; 1 KB = 1024 bytes. For prerendered routes, the script also cross-checks the chunk list against the `<script src>` tags in the HTML. If the HTML doesn't load a chunk that the manifests list, the check fails, because the build output format has changed. Scripts that appear only in the HTML are added to the route's total. Chunks loaded later through `next/dynamic` or `import()` don't count as first-load JS, which matches how Next computes its own First Load JS. The script also fails when `.next/` is missing, when a manifest can't be read, or when a listed chunk is missing.

Example output:

```
Route           Group  gzip KB  brotli KB  Budget KB  Status
--------------  -----  -------  ---------  ---------  ------
/               read     144.2      124.6       150*  ok
/403            read     135.4      116.6        140  ok
/login          read     133.8      115.2        140  ok

Shared framework floor (7 chunks loaded by every route): 132.2 KB gzip / 113.8 KB brotli
```

The **shared framework floor** is the set of chunks common to every route (React, Next runtime, root layout). It shows how much of each budget is fixed cost.

Budgets live in `scripts/bundle-budget.json`:

| Group | Routes | Budget (gzip) |
|---|---|---|
| `read` | Every route not under an `(interactive)` route group: read-only `(app)` routes, `(auth)` and top-level pages | 140 KB |
| `interactive` | Routes under `app/(app)/(interactive)/`, which load `QueryProvider` and `StoreProvider` | 180 KB |

Per-route overrides go in `routes`, keyed by URL path, each with a `reason`. To run it locally: `pnpm build && pnpm check:budget`. Build with the same env as CI (see `ci.yml`), not `.env.local`.

---

## 4. Dependabot auto-merge

`dependabot-auto.yml` runs on every Dependabot PR. Behavior depends on the semver update type:

| Update type | Behavior |
|---|---|
| Patch | Auto-merge via `gh pr merge --auto --squash` immediately |
| Minor | Auto-merge if the PR body contains no `BREAKING`, `breaking change`, or `deprecated` keywords |
| Major | Adds `needs-review` label and posts a comment noting the version range and asking for manual review |

Auto-merge uses `--auto`, which means the merge happens after all required status checks pass — the CI, Audit, and CodeQL workflows must green first.

### Manually reviewing a major bump

1. Open the PR. It will have the `needs-review` label and a bot comment showing the old and new version numbers.
2. Check the package changelog for breaking changes.
3. Run `pnpm install` locally and verify the build: `pnpm build`.
4. If safe to merge, remove the `needs-review` label and approve the PR. GitHub will merge it once checks pass.
5. If you need to defer it, add the `keep-open` label — this also exempts it from the stale workflow.

---

## 5. Claude Code hooks

Hooks are scripts that Claude Code runs at specific points in its tool lifecycle. They fire as `PreToolUse` events — before Claude executes a tool — and can either allow the action (exit `0`) or block it (exit `2`, with the error printed to stderr and fed back to Claude as context).

Hooks are registered in `.claude/settings.json` and live as shell scripts in `.claude/hooks/`.

### The three hooks

**`check-staged.sh`** — fires before every `git commit`

Inspects staged files (`.ts`, `.tsx`, `.js`, `.jsx`) and blocks the commit if:

- Biome reports lint errors in staged TypeScript/JavaScript files
- Any staged file contains `console.log`, `debugger`, or `TODO(hack)`
- A staged file is a `.env` file or matches a credential/secret filename pattern (`.pem`, `.key`, `*secret*`, `*credential*`)

**`check-architecture.sh`** — fires before every `git push`

Runs the same two checks as Architecture Guard, `pnpm check:arch` and `node scripts/check-barrels.mjs`, over the whole project. It blocks the push (exit `2`) if either one fails. The hook is optional local tooling: CI enforces the same rules whether or not you use Claude Code.

**`security-reminder.sh`** — fires before every `Edit` or `Write` tool call

Reads the target file path and injects context-aware reminders into Claude's response (exit `0`, never blocks):

| File pattern | Reminder |
|---|---|
| `*/middleware.ts`, `*/proxy.ts` | Auth bypass risks, session validation, token exposure |
| `*/entities/*/api/*` | Zod parse requirement for all API responses |
| `*.env*` | `NEXT_PUBLIC_` exposure risk, gitignore reminder |

### Customizing hooks

The hook registry is `.claude/settings.json`. The relevant section:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "if": "Bash(git commit *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-staged.sh"
          },
          {
            "type": "command",
            "if": "Bash(git push *)",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-architecture.sh"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/security-reminder.sh"
          }
        ]
      }
    ]
  }
}
```

To add a hook: add an entry to the appropriate `hooks` array. To disable a hook without deleting it: remove its entry from `settings.json`. To change what a hook checks: edit the shell script directly — the hook contract is `exit 0` to allow, `exit 2` to block (stderr text is shown to Claude).

---

## 6. Release Please

`release-please.yml` runs on every push to `main`. It reads Conventional Commits since the last release and opens (or updates) a single "Release PR" titled `chore(main): release X.Y.Z`. The PR contains:

- A `package.json` version bump
- An updated `CHANGELOG.md` with entries grouped by commit type

Merging the Release PR triggers a second run that creates a GitHub Release and git tag (`vX.Y.Z`). Template users who have enabled "Watch → Releases" on the repository receive a GitHub notification at this point.

### Version bump rules

| Commit type | Bump |
|---|---|
| `security:`, `fix:`, `build:` | patch (0.1.0 → 0.1.1) |
| `feat:` | minor (0.1.0 → 0.2.0) |
| `feat!:` or `BREAKING CHANGE:` footer | major (0.1.0 → 1.0.0) |
| `refactor:`, `perf:`, `docs:` | visible in changelog — no version bump |
| `chore:`, `test:`, `ci:`, `style:` | hidden — no release triggered |

### Security commit type

Use `security:` (not `fix:`) for security patches. Entries of this type appear in a dedicated `🔒 Security` section at the top of the changelog, making them easy to spot when template users decide whether to apply a change.

```
security: update next to patch CVE-2025-XXXX
security: sanitize user input in search-action to address GHSA-xxxx-xxxx-xxxx
```

When Dependabot opens a PR that is security-driven (an advisory, not a routine version bump), rename the PR title from `build(deps): bump X` to `security: bump X to patch GHSA-…` before merging.

### Configuration files

| File | Purpose |
|---|---|
| `release-please-config.json` | Changelog section order and visibility |
| `.release-please-manifest.json` | Tracks the last released version |
| `CHANGELOG.md` | Auto-generated; do not edit by hand |

---

## 7. Copilot instructions

`.github/copilot/instructions.md` provides project-specific context that GitHub Copilot uses when generating suggestions in this repository. It covers:

- Default Server Component rendering and when to add `"use client"`
- The `@/shared/ui` adapter rule (never import `@org/ui-kit` directly)
- `cn()` for className composition
- FSD layer import order and cross-slice restrictions
- Data fetching in Server Components vs. TanStack Query vs. Server Actions
- Zustand for UI state only
- Zod parsing at all system boundaries
- Naming conventions (PascalCase components, `camelCaseAction` Server Actions, kebab-case files)
- Security rules (DOMPurify, HttpOnly cookies, `NEXT_PUBLIC_` prefix policy)
- TDD testing approach

### Customizing Copilot suggestions

Append domain-specific rules to `.github/copilot/instructions.md`. Rules are applied in order, so append rather than insert to avoid unintended precedence changes. Keep rules concise — Copilot uses this file as context in every request, so large files degrade suggestion quality.

Examples of rules to add:

```markdown
## Domain: Payments

- Never log payment card data (PAN, CVV, expiry) to the console or include it in error messages.
- Use `formatCurrency(amount, currency)` from `@/shared/utils` for all monetary display values.
```
