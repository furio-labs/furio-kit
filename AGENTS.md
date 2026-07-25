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

- **Server Components by default.** Only add `"use client"` when hooks or event handlers are needed.
- **Adapter pattern.** Import UI from `@/shared/ui`, never from `@org/ui-kit` directly.
- **Barrel exports.** Every slice (`entities/*`, `features/*`, `widgets/*`) must have an `index.ts`.
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
| Architecture Guard | `architecture-guard.yml` | FSD layers, adapter pattern, barrel exports, no deep imports, UI kit connection (opt-in) |
| Vulnerability Audit | `audit.yml` | `pnpm audit --audit-level=high` |
| CodeQL | `codeql.yml` | Security analysis for JS/TS |
| Dependabot | `dependabot.yml` | Weekly dependency updates |
| Stale | `stale.yml` | Auto-close inactive PRs/issues |

## Code Intelligence

Code-graph and symbol-index MCP servers (codebase-memory-mcp, Serena) may be connected, and more than one may claim to be the tool to reach for first. See the **Code Intelligence** section of `CLAUDE.md` for the precedence rules.

They are **optional**. Every task here must remain doable with plain file reading and search — never assume an index server is present.

**Never add a rule that makes any external tool mandatory.** furio-kit is MIT-licensed and deployed commercially by the organizations that adopt it. Tooling the instruction files require becomes an obligation for every one of them, and inherits that tool's license restrictions along with it.

> A previous GitNexus integration was removed on 2026-07-25: it was distributed under the PolyForm Noncommercial license, yet `MUST` rules here required it before every edit and commit — which would have put every commercial adopter in violation. Do not reintroduce `gitnexus_*` tool calls. See `docs/wiki/10-gitnexus.md`.

## Code Style

- Components: `PascalCase` functional components
- Server Actions: `camelCase` with `Action` suffix (e.g., `loginAction`)
- Files: `kebab-case` for non-components, `PascalCase.tsx` for components
- Named exports everywhere except Next.js `page.tsx` / `layout.tsx` (default exports)
