# 10 — Performance on Slow Links

**TL;DR** — Every page costs about 133 KB of gzipped JavaScript before your code adds
anything. That is the Next.js App Router floor, and furio-kit accepts it
([ADR-009](../adr/009-framework-and-js-floor.md)). Your job is to keep everything above the
floor small:

- Put read-only routes in `app/(app)/`, and only routes that need client state in
  `app/(app)/(interactive)/`.
- Keep forms working without JavaScript.
- Load heavy widgets on demand.
- Let `pnpm check:budget` catch regressions.

---

## 1. The floor

Measured on a production build (gzip, modern browsers, excluding the 38 KB `noModule`
polyfill chunk that modern browsers never download):

| Route | What it renders | Client JS (gzip) |
|---|---|---|
| `/login` | One small client form (~1 KB of its own code) | 133 KB |
| `/403` | Static page, zero client components | 135 KB |
| `/` (before providers were scoped) | Server-rendered list, no interactivity | 144 KB |

- The framework floor is about **133 KB per page**. Server Components keep your code off
  the client, but they do not lower the floor. The App Router has no zero-JS page mode.
- The extra ~9 KB on `/` was TanStack Query + Zustand providers wrapping a page that used
  neither. Scoping the providers to `(interactive)` removes it.

What 133 KB costs on a first visit (transfer time only; round trips and the TLS handshake
add more on high-latency links):

| Link speed | Time to download 133 KB |
|---|---|
| 400 kbps (congested 3G, rural) | ~2.7 s |
| 1 Mbps | ~1.1 s |
| 10 Mbps | ~0.1 s |

Repeat visits are much cheaper (see [Caching](#7-caching)).

If most of your app is read-only content and your users are mostly on slow links, an
islands framework such as Astro (MIT) ships 0 KB on static pages. That may be the better
choice. ADR-009 explains when to choose it.

---

## 2. Route groups: where to put a route

The route group decides how much JavaScript a route pays for. URLs are not affected:
`app/(app)/(interactive)/orders/page.tsx` is still `/orders`.

| Group | Put a route here when | What the layout mounts |
|---|---|---|
| `app/(app)/` | It is authenticated and shows data. Forms that post to a Server Action are fine. | `Header` + `<main>`. No providers. |
| `app/(app)/(interactive)/` | It uses Zustand (`useUIStore`, `usePermission`), TanStack Query, or other client state shared across components. | `StoreProvider` + `QueryProvider` |
| `app/(auth)/` | It is part of the sign-in flow. | Minimal shell |

Start in `(app)`. Move a route to `(interactive)` only when it needs the providers.
`useUIStore` and `usePermission` throw outside `StoreProvider`, so you will find out
quickly if a route is in the wrong group.

`pnpm generate route` asks whether the route is read-only or interactive, and places it in
the matching group.

---

## 3. The JavaScript budget

`pnpm check:budget` runs `scripts/check-bundle-budget.mjs` against a production build, and
fails if a route ships more JavaScript than its budget allows. CI runs it, so a regression
fails the PR.

```bash
pnpm build
pnpm check:budget
```

Budgets live in `scripts/bundle-budget.json`:

- There is one budget per group: `read` and `interactive`.
- A single route can override its group's budget.

Next 16 no longer prints route sizes after `next build`, so this check is the only place
the numbers show up. Read its output when you add a dependency.

**When a route breaks its budget:**

1. Find what grew. Usually it is a new client dependency, or a `"use client"` placed too
   high in the tree.
2. Try the fixes in this guide first: push `"use client"` down, use `next/dynamic`, use a
   server-rendered form.
3. If the extra weight is justified, such as a rich editor on one page, add a per-route
   override for that route only. Say why in the PR. Do not raise the whole group's budget
   for one route.

**When the floor moves** after a Next or React upgrade, adjust the group budgets in the
same PR as the upgrade, and note the new floor.

---

## 4. Prefetch and the `Link` adapter

Next's `<Link>` prefetches routes as links enter the viewport. On a fast link this makes
navigation feel instant. On a slow or metered link, it spends the user's bandwidth on pages
they may never open.

Use the `Link` adapter from `@/shared/ui`, not `next/link` directly. It turns off prefetch
when the browser reports **Save-Data** or a **2g** connection type, and costs about 0.4 KB gzip.

```tsx
import { Link } from '@/shared/ui'

<Link href="/orders">Orders</Link>
```

The check uses `navigator.connection` (the Network Information API). Only Chromium-based
browsers implement it. In Firefox and Safari, prefetch stays at Next's default. On pages with
many links, pass `prefetch={false}` on links users rarely follow.

### Client components cost every page that imports them

Next ships every `'use client'` module a page imports, even through a barrel such as
`@/shared/ui`, and even if the page never renders it. Keep `'use client'` off adapters and
shared components unless they use hooks, refs or browser APIs themselves; a component without
the directive renders on the server for free and is bundled only when a client component
renders it. The budget check below is what catches a slip.

---

## 5. Forms that work before JavaScript loads

On a slow link, the HTML arrives seconds before the JavaScript. A form that needs
JavaScript to submit is dead during that time.

Use a native `<form>` with a Server Action as its `action`:

```tsx
// src/features/auth/ui/LoginForm.tsx (simplified sketch)
// Server Component — no "use client" needed
import { loginAction } from '../actions/login-action'

export function LoginForm() {
  return (
    <form action={loginAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Sign in</button>
    </form>
  )
}
```

The login form in furio-kit works this way. Before hydration, the browser posts the form
normally. After hydration, React submits it without a full page reload.

If you need pending state or field errors, use `useActionState` in a small client
component. It keeps working before hydration when the action is a Server Action.
Avoid `onSubmit` with `event.preventDefault()`, because it does nothing until JavaScript
has loaded.

---

## 6. Heavy interactive widgets: `next/dynamic`

A chart, rich-text editor or map can weigh more than the rest of the page. Load it only
where it is used, as a separate chunk:

```tsx
'use client'
import dynamic from 'next/dynamic'

const RevenueChart = dynamic(
  () => import('./RevenueChart').then((m) => m.RevenueChart),
  { ssr: false, loading: () => <p>Loading chart…</p> },
)
```

- `ssr: false` is only allowed inside a Client Component. Use it for libraries that read
  the DOM at render time (see the `mounted` guard in CLAUDE.md, Known Gotchas).
- Consider rendering the widget only after a user action ("Show chart"), so users who
  never open it never download it.
- If the widget is the only thing on the route that needs JavaScript, the route can often
  stay in `(app)`.

---

## 7. Caching

**Static assets.** Next names its JS and CSS chunks after their content hash, and serves
`/_next/static/*` with `Cache-Control: public, max-age=31536000, immutable`. After the
first visit, the browser reuses them without asking the server. A repeat visit downloads
only the HTML/RSC payload and any chunks that changed in a new deployment.

Do not override these headers in your CDN or reverse proxy.

**Compression.** `next start` compresses responses with gzip. Brotli usually produces
smaller JS files than gzip. Enable it at your CDN or reverse proxy (most CDNs support it). If the
upstream already compresses, set `compress: false` in `next.config.ts` so the work is not
done twice.

**HTML.** Static pages (such as `/403`) can be cached at the CDN. Authenticated pages are
rendered per user and must not be cached publicly.

Switching to a nonce-based CSP makes every page dynamic, which removes CDN caching of HTML
([ADR-010](../adr/010-csp-and-nonces.md)).

---

## 8. Opt-in: a service worker for static assets

A service worker can make repeat visits faster on unreliable links. It can serve cached
chunks even when the network stalls. furio-kit does **not** include one. Add it only if you
have measured a need.

[Serwist](https://serwist.pages.dev) (MIT) is a maintained service-worker toolkit with a
Next.js integration. Check its docs for current Next 16 and Turbopack support before you
adopt it.

> **Warning: never cache authenticated HTML or RSC responses.** In the App Router, a
> client-side navigation fetches the RSC payload from the **same path** as the page
> (with an `RSC` request header and an `_rsc` query parameter). A
> service worker that caches navigations or "same-origin GET" requests will store one
> user's data and can serve it after logout, or to the next user of a shared device.
> Precache and runtime-cache **only `/_next/static/*`**. Send everything else to the
> network.

Recipe outline (adapt it to Serwist's current API):

1. Install Serwist's Next.js package as a dev dependency, following its docs.
2. Write `app/sw.ts`:
   - Precache the build's `/_next/static/*` entries.
   - Add one runtime rule: `CacheFirst` for URLs whose path starts with `/_next/static/`.
   - Add **no** rule for navigations, `/api/*`, or RSC requests.
   - Turn off any "default cache" preset that caches pages.
3. Exclude the service-worker file (for example, `/sw.js`) from the `proxy.ts` matcher.
   Today the matcher only excludes `_next/static`, `_next/image` and `favicon.ico`. If you
   do not exclude it, an unauthenticated request for `/sw.js` is redirected to login, and
   registration fails.
4. Register the worker from a small client component, and only in production.
5. Test logout on a shared browser: sign out, sign in as another user, go offline, and
   confirm that no page from the first user appears.

---

## 9. Browser targets

`package.json` sets `browserslist` explicitly. It starts from Next's defaults:

```json
"browserslist": ["chrome 111", "edge 111", "firefox 111", "safari 16.4"]
```

Newer targets mean less transpiled code and fewer polyfills. Older targets mean more of
both.

- Choose targets from **your audience data** (analytics, or device inventories for
  internal apps), not from guesses.
- Low-bandwidth audiences often use older Android devices and in-app browsers. Check
  before you raise the targets.
- After you change targets, run `pnpm build && pnpm check:budget` and compare.

---

## Checklist for a new route

- [ ] Placed in `(app)` unless it needs Zustand or TanStack Query
- [ ] `"use client"` only on interactive leaves
- [ ] Forms post to a Server Action and work with JavaScript disabled
- [ ] Heavy widgets loaded with `next/dynamic`
- [ ] Links use the `Link` adapter from `@/shared/ui`
- [ ] `pnpm check:budget` passes

---

**Previous:** [09 — Extending the Template](./09-extending.md)
