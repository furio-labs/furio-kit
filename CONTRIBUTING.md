# Contributing to furio-kit

## Development setup

furio-kit uses git worktrees so each feature branch gets its own isolated directory without switching branches.

Node 24 is the recommended runtime (`.nvmrc` / `.node-version`); Node 22 is the
supported floor and CI runs both.

```bash
# 1. Clone the repo
git clone git@github.com:furio-labs/furio-kit.git
cd furio-kit

# 2. Use the pinned Node version
nvm use          # or: fnm use / asdf install

# 3. Create a worktree for your branch
git worktree add .worktrees/my-feature -b feature/my-feature

# 3. Install dependencies in the worktree
cd .worktrees/my-feature
pnpm install

# 4. Start the dev server
pnpm dev
```

When your work is ready:

```bash
# From inside the worktree directory
git push -u origin feature/my-feature
gh pr create
```

After the PR is merged, clean up:

```bash
cd ../..   # back to repo root
git worktree remove .worktrees/my-feature
git branch -d feature/my-feature
```

> `.worktrees/` is gitignored — worktree contents never appear in `git status` on `main`.

---

## Architecture Overview

This project follows **Feature-Sliced Design (FSD)** with layers that can only import from layers below them.

```
app → views → widgets → features → entities → shared
```

`@org/ui-kit` components (Atoms/Molecules) are never imported directly. All consumption goes through adapters in `src/shared/ui/`.

---

## Layer Rules

| Layer | What it contains | Can import from |
|---|---|---|
| `shared/ui` | Adapter wrappers around `@org/ui-kit` | `@org/ui-kit` only |
| `shared/providers` | QueryProvider, StoreProvider | `shared/model` |
| `shared/model` | Zustand store factories | — |
| `shared/utils` | `cn()`, `formatDate()`, etc. | — |
| `entities` | Domain types, API calls, domain UI | `shared` |
| `features` | Single user interactions | `shared`, `entities` |
| `widgets` | Self-contained page sections | `features`, `entities`, `shared` |
| `views` | Full route screens | `widgets`, `features` |
| `app` | Next.js layouts, pages, providers | `views`, `widgets` |

**Cross-slice imports at the same layer are forbidden.**

---

## How to Add a New Entity

An entity owns a domain model, its data access layer, and its presentational UI.

```bash
pnpm generate entity
# Follow the prompts (e.g. "product")
```

This creates:

```
src/entities/product/
  model/types.ts        ← Zod schema + inferred type
  api/get-products.ts   ← fetch + Zod parse at boundary
  ui/ProductCard.tsx    ← Server Component
  index.ts              ← public API barrel
```

**After generating:**

1. Fill in the Zod schema fields in `model/types.ts`
2. Update the API endpoint in `api/get-products.ts`
3. Add render fields to `ui/ProductCard.tsx`
4. Only export what external layers need from `index.ts`
5. Write a test for the card component

**Rules:**
- Always parse API responses through Zod (`parse()`, not `safeParse()`) — throw on invalid data
- Never import `@org/ui-kit` directly in entity UI — use `@/shared/ui` adapters
- Entity API functions live in `api/`, not in the component

---

## How to Add a New Feature

A feature owns a single user interaction: a form, a button that triggers a mutation, etc.

```bash
pnpm generate feature
# Follow the prompts (e.g. "add-to-cart")
```

This creates:

```
src/features/add-to-cart/
  ui/AddToCartForm.tsx          ← "use client" Client Component
  actions/add-to-cart-action.ts ← "use server" Server Action
  index.ts                      ← public API barrel
```

**After generating:**

1. Add Zod fields to the action's schema
2. Implement the Server Action logic (call a service, set cookies, revalidate paths)
3. Wire the form fields in the UI component
4. Export only the public surface from `index.ts`

**Rules:**
- Features are typically Client Components (`"use client"`)
- Server Actions must validate all input with Zod before processing
- Never store auth tokens in Client Components — use `HttpOnly` cookies set server-side
- Feature UI imports from `@/shared/ui`, never from `@org/ui-kit` directly

---

## How to Add a New Widget

A widget is a self-contained page section (e.g. Sidebar, DashboardCard).

```bash
pnpm generate widget
# Follow the prompts (e.g. "user-sidebar")
```

**After generating:**

1. Add data fetching as props from the parent Server Component (or fetch inside if it needs Suspense)
2. Compose features and entities within the widget
3. Keep widgets as Server Components unless they need client-side interactivity

---

## Adapter Pattern

Every `@org/ui-kit` component must be wrapped in an adapter before use:

```tsx
// src/shared/ui/Button/Button.tsx
'use client'
import { Button as OrgButton } from '@org/ui-kit'

export function Button({ children, variant = 'primary', ...rest }) {
  return <OrgButton variant={variant} {...rest}>{children}</OrgButton>
}
```

Then import from the barrel:

```ts
import { Button } from '@/shared/ui'  // ✅
import { Button } from '@org/ui-kit'  // ❌ forbidden outside shared/ui
```

---

## Auth Adapters

The active auth adapter lives in `src/shared/auth/index.ts`. To switch providers:

```ts
// Before
import { mockAdapter } from './adapters/mock'
export const authAdapter = mockAdapter

// After (e.g. Auth0)
import { auth0Adapter } from './adapters/auth0'
export const authAdapter = auth0Adapter
```

See the adapter files for required env vars and install instructions.

---

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/). The `release-please` workflow reads commit types to determine the version bump and populate the changelog.

| Type | When to use | Changelog section |
|---|---|---|
| `security:` | Security patch (CVE, advisory, sanitization fix) | 🔒 Security — always at the top |
| `feat:` | New capability | Features |
| `fix:` | Bug fix | Bug Fixes |
| `build(deps):` | Dependency update (Dependabot) | Build System |
| `refactor:` | Internal restructure, no behavior change | Code Refactoring |
| `perf:` | Performance improvement | Performance |
| `docs:` | Documentation only | Documentation |
| `chore:` | Maintenance (hidden from changelog) | — |
| `ci:` | CI/CD changes (hidden from changelog) | — |
| `test:` | Test additions or changes (hidden from changelog) | — |
| `style:` | Formatting, whitespace (hidden from changelog) | — |

**Security PRs:** When Dependabot opens a PR for a security advisory, rename its title from `build(deps):` to `security:` before merging so it appears in the `🔒 Security` section.

**Breaking changes:** Add `!` after the type (`feat!:`) or a `BREAKING CHANGE:` footer to trigger a major version bump.

---

## Repository Protection (for adopters)

The workflows in `.github/workflows/` travel with a clone. **Branch protection does
not** — it lives in GitHub repository settings, not in the repo. A fresh clone or
fork of furio-kit starts with an unprotected default branch, so CI, CodeQL, and the
audit workflow all run but none of them can block a merge.

If you deploy this boilerplate, configure protection on your default branch. What
`furio-labs/furio-kit` uses, as a starting point:

| Rule | Value |
|---|---|
| Require a pull request | on |
| Required approvals | `1` for teams; `0` for a solo maintainer (see below) |
| Require status checks | `Typecheck · Lint · Test · Build (Node 22)` and `(Node 24)` |
| Require code scanning | CodeQL — errors / high-or-higher |
| Require signed commits | on |
| Require linear history | on |
| Allowed merge method | squash only |

Applied via the CLI:

```bash
gh api -X POST repos/OWNER/REPO/rulesets --input ruleset.json
```

Three things that are easy to get wrong:

- **Required check names are literal strings.** They must match the `name:` your CI
  job renders, matrix values included. Renaming a job or changing the matrix without
  updating the ruleset blocks every PR on a check that will never report, with no
  error explaining why.
- **A solo maintainer cannot approve their own PR.** With required approvals set to
  `1` and one collaborator, every PR you author needs an admin bypass — which trains
  you to bypass reflexively, so a bypass that *should* have given you pause doesn't.
  Set approvals to `0` and let CI, code scanning, and signing be the real gates.
- **`strict_required_status_checks_policy`** forces every PR to be rebased onto the
  latest default branch before merging. With several Dependabot PRs open that becomes
  a rebase treadmill; leave it off unless you need the stronger guarantee.

---

## Commands

```bash
pnpm dev           # dev server (Turbopack)
pnpm test          # run tests
pnpm lint          # Biome lint
pnpm format        # Biome format
pnpm tsc --noEmit  # typecheck
pnpm generate      # Plop slice generators
pnpm audit         # security audit
```
