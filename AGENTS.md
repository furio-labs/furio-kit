# AGENTS.md

This file provides instructions to AI coding assistants (Claude Code, GitHub Copilot, Cursor, etc.) working in this repository.

## Project

furio-kit is a React boilerplate by FurioLabs for enterprise frontends. It uses Next.js 16+ App Router with React Server Components and follows Feature-Sliced Design (FSD).

## Before Writing Code

1. Read `CLAUDE.md` for full architectural context and conventions.
2. Read `node_modules/next/dist/docs/` for Next.js API reference (bundled with Next.js 16.2+).
3. Check `CONTRIBUTING.md` for development workflow.

## Architecture Quick Reference

### FSD Layer Hierarchy (imports flow downward only)

```
app        -> views, widgets, features, entities, shared
views      -> widgets, features, entities, shared
widgets    -> features, entities, shared
features   -> entities, shared
entities   -> shared
shared     -> (nothing above)
```

Cross-slice imports at the same layer are **forbidden**.

### Key Rules

- **Small JS by default.** Read-only routes go in `app/(app)/`; only routes that need Zustand or TanStack Query go in `app/(app)/(interactive)/`, whose layout mounts the providers. Scaffold with `pnpm generate route`. CI fails a route over its budget in `scripts/bundle-budget.json`.
- **Server Components by default.** Only add `"use client"` when the component itself uses hooks, refs or browser APIs. Next ships every `"use client"` module a page imports (even through the `@/shared/ui` barrel), so a needless directive costs every page.
- **Adapter pattern.** Import UI from `@/shared/ui`. Only `src/shared/ui/**` may import `#ui-kit`, `src/shared/ui/kit/**` or `@org/ui-kit`. A kit satisfies `src/shared/ui/kit/CONTRACT.md` and uses semantic token classes (`bg-primary`), never palette classes.
- **Links.** Use `Link` from `@/shared/ui` (no prefetch on Save-Data / 2G), never `next/link` directly.
- **Auth and env.** Server code imports `@/shared/auth/server`; client code `@/shared/auth/client`. The backend URL is server-only `API_URL`. `AUTH_PROVIDER` selects the auth adapter.
- **Barrel exports.** Every slice (`entities/*`, `features/*`, `widgets/*`, `views/*`) must have an `index.ts`.
- **Zod validation.** All `entities/*/api/` functions must parse responses through a Zod schema.
- **State separation.** Zustand is for UI state only. Never store server-fetched data in Zustand.
- **className composition.** Use `cn()` from `@/shared/utils`. Never use template literals for classNames.

## Automated Checks (do not duplicate)

The following checks run automatically in CI. Do not bypass or disable them. If a check fails, fix the underlying issue.

| Check | Where | What it enforces |
|---|---|---|
| TypeScript | `ci.yml` | `pnpm tsc --noEmit` - no type errors |
| Biome | `ci.yml` | `pnpm lint` - lint rules + import organization |
| Vitest | `ci.yml` | `pnpm test` - all tests pass |
| Build | `ci.yml` | `pnpm build` - production build succeeds |
| JS budget | `ci.yml` | `pnpm check:budget` - per-route first-load JS within `scripts/bundle-budget.json` |
| Architecture Guard | `architecture-guard.yml` | `pnpm check:arch` (dependency-cruiser): FSD layers, cross-slice and deep imports, UI kit boundaries, server-only auth, cycles; plus barrel exports |
| Vulnerability Audit | `audit.yml` | `pnpm audit --audit-level=high` |
| CodeQL | `codeql.yml` | Security analysis for JS/TS |
| Dependabot | `dependabot.yml` | Weekly dependency updates |
| Stale | `stale.yml` | Auto-close inactive PRs/issues |

## Tooling

**Never add a rule that makes any external tool mandatory.** furio-kit is MIT-licensed and deployed commercially by the organizations that adopt it. Tooling the instruction files require becomes an obligation for every one of them, and inherits that tool's license restrictions along with it. Every task here must remain doable with plain file reading and search.

> A previous GitNexus integration was removed on 2026-07-25: it was distributed under the PolyForm Noncommercial license, yet `MUST` rules here required it before every edit and commit — which would have put every commercial adopter in violation. Do not reintroduce `gitnexus_*` tool calls. See the §8 postscript in `docs/whitepaper-architecture-strategy.md`.

## Code Style

- Components: `PascalCase` functional components
- Server Actions: `camelCase` with `Action` suffix (e.g., `loginAction`)
- Files: `kebab-case` for non-components, `PascalCase.tsx` for components
- Named exports everywhere except Next.js `page.tsx` / `layout.tsx` (default exports)
