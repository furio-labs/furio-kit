# 05 — Authentication

**Quick start:** For local development nothing needs configuring: `AUTH_PROVIDER` defaults to `mock`. The mock adapter returns no session unless `MOCK_AUTH_USER` is set, so add `MOCK_AUTH_USER=1` to `.env.local` to develop against protected routes. To go to production, set `AUTH_PROVIDER=auth0` or `AUTH_PROVIDER=ping`, install that provider's SDK, finish the adapter stub, add the required env vars, and deploy. Selecting a provider is configuration, not a code change.

---

## 1. Auth Architecture

Authentication uses a pluggable adapter pattern. The `AuthAdapter` interface in `src/shared/auth/auth-adapter.ts` defines a contract that every provider must satisfy:

```ts
// src/shared/auth/auth-adapter.ts
export interface AuthAdapter {
  getSession(request: NextRequest): Promise<Session | null>
  validateRequest(request: NextRequest): Promise<Session | null>
  getLoginUrl(returnTo?: string): string
  getLogoutUrl(returnTo?: string): string
}
```

- `validateRequest` / `getSession` — read the session from the incoming request (HttpOnly cookies), validate it through `SessionSchema` (Zod), and return the `Session` or `null`.
- `getLoginUrl` / `getLogoutUrl` — provider-specific URLs, with the post-login/logout target as `returnTo`.

Three adapters ship out of the box:

| `AUTH_PROVIDER` | File | Use case |
|---|---|---|
| `mock` (default) | `src/shared/auth/adapters/mock.ts` | Local development; mock admin session when `MOCK_AUTH_USER` is set; never authenticates in production |
| `auth0` | `src/shared/auth/adapters/auth0.ts` | Auth0 tenant integration (stub; finish it before use) |
| `ping` | `src/shared/auth/adapters/ping.ts` | PingFederate / PingOne (stub; finish it before use) |

All session data is stored in `HttpOnly; Secure; SameSite=Strict` cookies set server-side. Tokens never touch `localStorage` or the client bundle.

### Entry points: server, client, shared

`src/shared/auth` has three entry points so server code never leaks into client bundles and vice versa:

| Import | Contents | Usable from |
|---|---|---|
| `@/shared/auth/server` | `getAuthAdapter()`, `getServerSession()`, `requirePermission()` | `proxy.ts`, Server Components, Server Actions, Route Handlers. Starts with `import 'server-only'`, so importing it from a Client Component fails the build |
| `@/shared/auth/client` | `usePermission()` | Client Components. Starts with `import 'client-only'` |
| `@/shared/auth` | Types (`Session`, `AuthUser`, `Permission`, `AuthAdapter`), `hasPermission()`, `SessionSchema`, `AuthUserSchema` | Anywhere; pure code only |

Never import an adapter file directly; go through `@/shared/auth/server`.

---

## 2. Route Protection

Route protection is handled by `proxy.ts` at the project root (Next.js 16's replacement for `middleware.ts`). It protects **all routes by default** using an allowlist approach.

On every request, `proxy.ts`:

1. Checks if the path is in `PUBLIC_PATHS` (the allowlist). If so, lets the request through immediately.
2. Loads the active adapter with `await getAuthAdapter()` and calls `validateRequest(request)` for all other paths.
3. If the user is authenticated, attaches a `x-request-id` header and allows the request to continue.
4. If the session is missing or invalid, redirects the browser to `getLoginUrl(pathname)`, which carries the original path as a `returnTo` query parameter.

```ts
// proxy.ts (excerpt)
import { getAuthAdapter } from '@/shared/auth/server'

const PUBLIC_PATHS = ['/login', '/api/auth', '/403']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

The `config.matcher` excludes Next.js static assets (`_next/static`, `_next/image`, `favicon.ico`) from the proxy entirely. Everything else is checked.

**To make a new route public**, add it to `PUBLIC_PATHS`:

```ts
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/403',
  '/about',       // add new public paths here
]
```

**Do not change `config.matcher`** to allow public paths — that approach creates gaps. Always use the `PUBLIC_PATHS` allowlist instead, which makes public paths explicit and auditable in one place.

---

## 3. Environment Validation and the Mock Guard

### Startup env validation

`src/shared/env.ts` (server-only) validates environment variables at server startup using Zod:

```ts
// src/shared/env.ts
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  AUTH_PROVIDER: z.enum(['auth0', 'ping', 'mock']).default('mock'),
  API_URL: z.url().optional(),
})

export const env = EnvSchema.parse({ ... })
```

This is triggered by `instrumentation.ts` (a Next.js startup hook):

```ts
// instrumentation.ts
export async function register() {
  await import('@/shared/env')
}
```

An unknown `AUTH_PROVIDER` or a malformed `API_URL` throws a Zod error from the instrumentation hook at startup; the server logs it and answers every request with HTTP 500 until the value is fixed. To add a new variable, add it to `EnvSchema` and read it from `env` in server code.

### Mock adapter in production: fail closed

The mock adapter is safe to ship because it **fails closed**: under `NODE_ENV=production` it returns no session for every request, even when `MOCK_AUTH_USER` is set, and logs one `auth.mock.production` error through `@/shared/observability`. It never throws at load time.

The result for a production build with `AUTH_PROVIDER=mock` (for example a fresh clone, a preview deploy or `pnpm start` locally):

- `/login` and `/403` render normally (HTTP 200).
- Every protected route redirects to `/login`.
- Nobody can sign in until a real provider is configured.

This keeps a misconfigured deploy unauthenticated rather than open, without turning every route (including `/login`) into an HTTP 500.

---

## 4. Switching Providers

Set `AUTH_PROVIDER` in the environment. `getAuthAdapter()` in `src/shared/auth/server.ts` maps the value to a lazily imported adapter:

```ts
// src/shared/auth/server.ts (excerpt)
const ADAPTER_LOADERS: Record<AuthProvider, () => Promise<AuthAdapter>> = {
  mock: () => import('./adapters/mock').then((m) => m.mockAdapter),
  auth0: () => import('./adapters/auth0').then((m) => m.auth0Adapter),
  ping: () => import('./adapters/ping').then((m) => m.pingAdapter),
}
```

Only the selected adapter's code runs. The build, however, **resolves every `import()` target in this map**, whichever provider is selected (verified with Turbopack: an uninstalled package imported by `auth0.ts` fails `pnpm build` even with `AUTH_PROVIDER=mock`). The shipped Auth0 and Ping adapters are stubs with no SDK imports, so a fresh clone builds without them. When you enable one:

| Provider | Install | Then |
|---|---|---|
| Auth0 | `pnpm add @auth0/nextjs-auth0` | Replace the stub in `adapters/auth0.ts` with the SDK session call |
| Ping | `pnpm add jose` | Replace `validateJwt` in `adapters/ping.ts` with `jwtVerify` + `createRemoteJWKSet` |

Install the package **before** adding its import. Once you settle on a provider, delete the adapters you don't use and their lines in `ADAPTER_LOADERS`.

---

## 5. Required Environment Variables

Add these to `.env.local` (development) or your deployment environment. Never prefix auth secrets with `NEXT_PUBLIC_`.

### Mock

```bash
AUTH_PROVIDER=mock      # default; may be omitted
MOCK_AUTH_USER=1        # development only: mock admin session
```

### Auth0

```bash
AUTH_PROVIDER=auth0
APP_BASE_URL=https://app.example.com   # used for the OIDC callback URL
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH_SECRET=...
```

### PingFederate

```bash
AUTH_PROVIDER=ping
APP_BASE_URL=https://app.example.com   # used for the OIDC callback URL
PING_ISSUER=https://your-ping-host/as
PING_CLIENT_ID=your_client_id
PING_CLIENT_SECRET=your_client_secret
```

Keep `.env.example` up to date when adding new variables so other developers know what is required.

---

## 6. Adding a New Provider

**Step 1.** Create `src/shared/auth/adapters/your-provider.ts` and implement `AuthAdapter`, parsing the session through `SessionSchema`:

```ts
// src/shared/auth/adapters/your-provider.ts
import type { NextRequest } from 'next/server'
import type { AuthAdapter } from '../auth-adapter'
import { SessionSchema } from '../types'

export const yourProviderAdapter: AuthAdapter = {
  async getSession(request: NextRequest) {
    const token = request.cookies.get('your_session')?.value
    if (!token) return null
    // Verify the token with your provider's SDK or JWKS endpoint, then:
    return SessionSchema.parse({ user: { /* ... */ }, expiresAt: /* ... */ 0 })
  },
  async validateRequest(request) {
    return this.getSession(request)
  },
  getLoginUrl(returnTo = '/') {
    return `${process.env.YOUR_PROVIDER_ISSUER}/authorize?state=${encodeURIComponent(returnTo)}`
  },
  getLogoutUrl(returnTo = '/') {
    return `${process.env.YOUR_PROVIDER_ISSUER}/logout?returnTo=${encodeURIComponent(returnTo)}`
  },
}
```

**Step 2.** Add the provider name to `AUTH_PROVIDERS` in `src/shared/env.ts`.

**Step 3.** Add its loader to `ADAPTER_LOADERS` in `src/shared/auth/server.ts` (TypeScript flags the map as incomplete until you do):

```ts
yourProvider: () => import('./adapters/your-provider').then((m) => m.yourProviderAdapter),
```

**Step 4.** Add its env vars to `.env.example` with inline comments, then set `AUTH_PROVIDER=yourProvider`.

---

## 7. Login Form (works without JavaScript)

`LoginForm` (`src/features/auth`) is a **Server Component** rendering a plain `<form action={loginAction}>`. Next.js renders the Server Action as a native form POST, so the form submits before the framework JavaScript has loaded (or if it never does).

- `loginAction(formData)` validates input with Zod. On failure it redirects (HTTP 303) back to `/login?error=<code>`; on success it should set the HttpOnly session cookie and redirect to `returnTo`.
- Errors travel as fixed codes (`invalid_email`, `password_too_short`, `invalid_input`, `not_configured`) mapped to messages in `features/auth/model/login-errors.ts`. Unknown values render a generic message; query-string text is never echoed.
- `returnTo` (set by the proxy redirect) is carried in a hidden field and accepted only as a same-origin relative path, which prevents open redirects.

`LoginForm` reads the error and `returnTo` from the page's `searchParams`, so the login page passes them through:

```tsx
// app/(auth)/login/page.tsx
import { LoginForm, type LoginFormProps } from '@/features/auth'

export default function LoginPage({ searchParams }: Required<LoginFormProps>) {
  return <LoginForm searchParams={searchParams} />
}
```

Use the same pattern for other low-JS forms: a Server Component form bound to a Server Action, with results reported through a redirect. Reach for `useActionState` (a Client Component) only when you need pending UI or client-side state.

---

## 8. Role-Based Access Control (RBAC)

RBAC is implemented in `src/shared/auth/permissions.ts`. It defines a `Permission` type, a `ROLE_PERMISSIONS` map, and a `hasPermission()` function.

### Permissions and roles

```ts
// src/shared/auth/permissions.ts
export type Permission =
  | 'users:read'
  | 'users:write'
  | 'settings:read'
  | 'settings:write'
  | 'reports:read'

const ROLE_PERMISSIONS: Record<AuthUser['role'], Permission[]> = {
  admin:  ['users:read', 'users:write', 'settings:read', 'settings:write', 'reports:read'],
  member: ['users:read', 'reports:read'],
  viewer: ['reports:read'],
}
```

Add new permissions to the `Permission` type, then assign them to the appropriate roles in `ROLE_PERMISSIONS`.

### Server-side (Server Components, Server Actions)

Use `requirePermission()`. It reads the session for the current request, redirects to the login URL when unauthenticated and to `/403` when the permission is missing, and otherwise returns the session:

```ts
import { requirePermission } from '@/shared/auth/server'

export async function updateSettingsAction(formData: FormData) {
  'use server'
  const session = await requirePermission('settings:write')
  // ...
}
```

For custom checks, `getServerSession()` returns the `Session` (or `null`) and `hasPermission(user, permission)` from `@/shared/auth` tests it.

### Client-side (Client Components)

Use the `usePermission()` hook, which reads the session user from the Zustand store. It is for hiding UI only; real enforcement is always server-side:

```tsx
'use client'
import { usePermission } from '@/shared/auth/client'

export function AdminPanel() {
  const canWrite = usePermission('settings:write')
  if (!canWrite) return null
  return <div>Admin settings…</div>
}
```

### 403 page

`app/403/page.tsx` renders the access-denied state. `requirePermission()` redirects there when a permission check fails.

---

## 9. Testing Auth Locally

Use the mock adapter for local development. It skips any real token exchange and returns a hardcoded admin session when `MOCK_AUTH_USER` is set:

```bash
# .env.local
AUTH_PROVIDER=mock
MOCK_AUTH_USER=1
```

To test the unauthenticated flow (e.g. the login redirect), remove `MOCK_AUTH_USER` and restart the dev server.

In Vitest, `server-only` and `client-only` are aliased to no-op modules (`vitest.config.ts`), so server modules such as `@/shared/auth/server` can be imported in tests. Stub `next/headers` / `next/navigation` with `vi.mock`, and select adapters with `vi.stubEnv('AUTH_PROVIDER', ...)` followed by `vi.resetModules()` (the env is parsed once at import). See `src/shared/auth/server.test.ts`.

---

## 10. Security Rules

These rules are non-negotiable. They reflect the security posture defined in [CLAUDE.md](../../CLAUDE.md) and must be maintained when adding or modifying auth code.

| Rule | Rationale |
|---|---|
| Auth tokens stored in `HttpOnly; Secure; SameSite=Strict` cookies only | Prevents XSS token theft; `HttpOnly` blocks JavaScript access |
| Never use `localStorage` or `sessionStorage` for tokens | Both are accessible to JavaScript and vulnerable to XSS |
| Never prefix auth secrets or backend URLs with `NEXT_PUBLIC_` | `NEXT_PUBLIC_` variables are inlined into the client JavaScript |
| Session validation only in Server Components, Server Actions or `proxy.ts` | Client Components cannot be trusted to enforce access control |
| Import adapters and session helpers only via `@/shared/auth/server` | `server-only` turns an accidental client import into a build error |
| All `validateRequest` implementations must use Zod to parse session payloads | Ensures token claims are the expected shape before use |
| Post-login redirects accept only same-origin relative paths | Prevents open redirects through `returnTo` |
| Rendering user-supplied content as raw HTML requires DOMPurify sanitization first | Prevents stored XSS if auth error messages or user names are rendered |

If a security rule and a development convenience conflict, the security rule wins.
