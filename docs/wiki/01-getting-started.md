# Getting Started

Get a new app running from furio-kit in under five minutes: clone or degit the template, configure two environment variables, and hit `pnpm dev`.

---

## Prerequisites

| Requirement | Minimum version | Install |
|---|---|---|
| Node.js | 22 | [nodejs.org](https://nodejs.org) |
| pnpm | 12 | `npm install -g pnpm` |

Verify before proceeding:

```bash
node --version   # v22.x.x or higher
pnpm --version   # 12.x.x or higher
```

The repository is pnpm-only. `devEngines.packageManager` in `package.json` makes `npm install` fail before it writes a `package-lock.json` or `node_modules`.

---

## Bootstrap

Pick one of three paths.

### Option A — degit (recommended)

Copies the template without the git history, so you start with a clean slate.

```bash
pnpm dlx degit furio-labs/furio-kit my-app
cd my-app
git init && git add -A && git commit -m "chore: init from furio-kit"
```

### Option B — GitHub template

1. Open [furio-labs/furio-kit](https://github.com/furio-labs/furio-kit) on GitHub.
2. Click **Use this template** > **Create a new repository**.
3. Clone your new repository locally.

```bash
git clone https://github.com/<your-org>/my-app.git
cd my-app
```

### Option C — Manual clone

Clone and strip the upstream history yourself.

```bash
git clone https://github.com/furio-labs/furio-kit.git my-app
cd my-app
rm -rf .git
git init && git add -A && git commit -m "chore: init from furio-kit"
```

---

## Environment Setup

The repository ships with a `.env.example` file. Copy it to `.env.local` — Next.js loads this file automatically and never commits it.

```bash
cp .env.example .env.local
```

Open `.env.local` and review these variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | App display name shown in the UI and browser tab |
| `API_URL` | Base URL for your backend REST API (e.g. `http://localhost:4000`). Server-only. Leave it unset in development to use the built-in mock data; in production an unset `API_URL` makes data requests fail with an error rather than serve mock data |
| `AUTH_PROVIDER` | `mock` (default), `auth0` or `ping`. Selects the auth adapter at runtime; no code change needed. `mock` authenticates nobody in production |
| `MOCK_AUTH_USER` | Development only, with `AUTH_PROVIDER=mock`: any non-empty value gives you a mock admin session |

`NODE_ENV`, `AUTH_PROVIDER` and `API_URL` are validated with Zod in `src/shared/env.ts` at server startup (via `instrumentation.ts`); an invalid value, such as a malformed `API_URL` or an unknown `AUTH_PROVIDER`, is reported as a Zod error in the server log at startup and every request fails with HTTP 500 until it is fixed.

The provider variables (`AUTH_SECRET`, `APP_BASE_URL`, `AUTH0_*`, `PING_*`) are commented out. Leave them commented until you wire up an authentication provider. See [05-auth.md](./05-auth.md) for setup instructions.

> Never use the `NEXT_PUBLIC_` prefix for secrets or backend addresses. `NEXT_PUBLIC_` variables are inlined into the browser bundle; variables without that prefix stay on the server.

### Building and previewing locally

`pnpm build` prerenders static routes, so build with the same environment as CI rather than your `.env.local`:

```bash
API_URL= NEXT_PUBLIC_APP_NAME=furio-kit AUTH_PROVIDER=mock pnpm build
pnpm start
```

With the default mock adapter, a production server serves `/login` and `/403`, and redirects every protected route to `/login` (the mock never authenticates anyone under `NODE_ENV=production`). Configure a real provider to sign in.

---

## First Run

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

The app opens at [http://localhost:3000](http://localhost:3000) with Turbopack for fast hot reloads.

**What you see out of the box:**

- A **home page** (`/`) with a user list rendered from the `entities/user` starter content. It is a protected route: set `MOCK_AUTH_USER=1` in `.env.local` to see it, otherwise you are redirected to `/login`.
- A **login page** (`/login`) wired to the `features/auth` stub.

Both are starter content — they demonstrate the FSD layer conventions and are meant to be replaced.

---

## Remove Starter Content

Once you understand the structure, delete the placeholder slices and replace them with your own domain.

```bash
# Remove the user entity (UI, API, types)
rm -rf src/entities/user

# Remove the auth feature stub (only if you are wiring real auth yourself)
rm -rf src/features/auth
```

Then update the screens that referenced them:

- `src/views/home/ui/HomePage.tsx` — remove the `UserList` import and replace with your own content.
- `app/(auth)/login/page.tsx` — renders `LoginForm` from `features/auth`; replace it if you deleted that slice.

> Tip: `pnpm exec tsc --noEmit` and `pnpm check:arch` surface any broken imports after the deletion.

---

## Project Structure

```
app/                  Next.js App Router — layouts, route pages, error/loading boundaries
  (app)/              Authenticated read-only routes (no client state providers)
    (interactive)/    Routes that need Zustand / TanStack Query (providers mounted here)
  (auth)/             Login, a form that works before JavaScript loads
src/
  shared/             UI adapters, UI kit (ui/kit/), providers, auth, env, utils, types
  entities/           Business domain models — types, API calls, domain UI (Organisms)
  features/           User interactions — forms, Server Actions, client mutations
  widgets/            Self-contained page sections — Header, Sidebar, Dashboard panels
  views/              Full route screens composed from widgets and features
.github/              CI workflows, Dependabot config, Copilot instructions
scripts/              JS budget check (bundle-budget.json) and barrel check
.claude/              Optional Claude Code hooks and settings
docs/wiki/            This wiki
```

Imports flow **downward only**: `app` → `views` → `widgets` → `features` → `entities` → `shared`. Cross-slice imports at the same layer are forbidden.

---

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server on port 3000 (Turbopack) |
| `pnpm build` | Compile a production build |
| `pnpm start` | Run the compiled production build |
| `pnpm lint` | Run Biome linter across the codebase |
| `pnpm format` | Run Biome formatter and write changes |
| `pnpm test` | Run the Vitest test suite once |
| `pnpm test:watch` | Run Vitest in interactive watch mode |
| `pnpm generate` | Scaffold a route, adapter, entity, feature or widget (Plop) |
| `pnpm check:arch` | Check import boundaries with dependency-cruiser |
| `pnpm check:budget` | Check each route's first-load JS against its budget (after `pnpm build`) |
| `pnpm audit` | Check npm dependencies for known vulnerabilities |

---

**Next:** [02-architecture.md](./02-architecture.md) — a deeper look at the FSD layer conventions and RSC rendering model.
