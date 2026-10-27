# Copilot Instructions for furio-kit

## Architecture

- Small JS by default: read-only routes go in `app/(app)/`; routes that need Zustand or TanStack Query go in `app/(app)/(interactive)/`. CI enforces per-route budgets (`scripts/bundle-budget.json`).
- All components are Server Components by default. Only add `"use client"` when the component itself uses hooks, refs, or browser APIs; an `onClick` prop alone doesn't need it.
- Import UI primitives from `@/shared/ui`. Only `src/shared/ui/**` may import `#ui-kit` or `@org/ui-kit`. Use semantic token classes (`bg-primary`), never palette classes (`bg-blue-600`).
- Use `Link` from `@/shared/ui`, never `next/link` directly.
- Use `cn()` from `@/shared/utils` for className composition. Never use template literals for classNames.
- Follow Feature-Sliced Design. Imports flow downward only: `app > views > widgets > features > entities > shared`.
- No cross-slice imports at the same layer.
- Every slice under `entities/`, `features/`, `widgets/`, `views/` must have an `index.ts` barrel export.

## Data & State

- Fetch initial data in async Server Components. Never fetch in Client Components for initial render.
- Use Server Actions (`"use server"`) for mutations.
- Use TanStack Query for client-side cache and optimistic UI within Client Components.
- Zustand is for UI state only (sidebar open, theme, etc.). Never store server-fetched data in Zustand.
- All API response data must be parsed through a Zod schema before use.

## Code Style

- Components: PascalCase, functional only.
- Server Actions: camelCase with `Action` suffix (e.g., `loginAction`).
- Files: kebab-case for non-components, PascalCase.tsx for components.
- Named exports everywhere except Next.js page/layout files.

## Security

- Validate all external input with Zod at system boundaries (API routes, Server Actions, form data).
- Never use raw HTML injection without DOMPurify sanitization.
- Environment secrets and backend URLs only in server code, via `env` from `@/shared/env`. The backend URL is `API_URL`, never `NEXT_PUBLIC_API_URL`.
- Client-safe env vars must use `NEXT_PUBLIC_` prefix.
- Import auth from `@/shared/auth/server` (server) or `@/shared/auth/client` (client); `AUTH_PROVIDER` selects the adapter.
- Auth tokens in HttpOnly cookies only, never localStorage.

## Tooling

- Every task must be completable with plain file reading and search; never assume an MCP or index server is available.
- Never introduce a rule making an external tool mandatory. furio-kit is MIT-licensed and deployed commercially by adopters; required tooling imposes its license on all of them. A GitNexus integration was removed on 2026-07-25 for exactly this reason (PolyForm Noncommercial license, mandated by `MUST` rules).

## Testing

- Tests co-located with source: `*.test.ts` / `*.test.tsx`.
- Use Vitest + React Testing Library.
- Write tests before implementing new features (TDD).
- For bug fixes, write a failing test first.
