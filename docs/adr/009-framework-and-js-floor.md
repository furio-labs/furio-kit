# ADR-009: Framework Choice and the JavaScript Floor

**Date:** 2026-10-26
**Status:** Accepted
**Priority:** High
**Deciders:** FurioLabs engineering team

---

## Context

furio-kit is a template for frontends used in low-bandwidth environments. The goal is small
JavaScript by default, and larger JavaScript only on pages that are highly interactive, such
as complex forms.

We measured a production build (gzip, modern browsers, excluding the 38 KB `noModule`
polyfill chunk that modern browsers never download):

| Route | What it renders | Client JS (gzip) |
|---|---|---|
| `/login` | One small client form (~1 KB of its own code) | 133 KB |
| `/403` | Static page, zero client components | 135 KB |
| `/` | Server-rendered list, no interactivity | 144 KB |

What the numbers say:

- The Next.js App Router has a framework floor of about **133 KB gzip per page**. A page
  with no client components of its own still ships it.
- React Server Components keep *application* code off the client. They do not reduce the
  framework floor.
- The App Router has no supported zero-JS page mode.
- The extra ~9 KB on `/` was TanStack Query and Zustand. Their providers wrapped every
  authenticated page in `app/(app)/layout.tsx` (ADR-003), including pages that use neither.
- Next 16's build output no longer prints route sizes, so nothing told us about the cost
  until we measured it by hand.

On a 400 kbps link, 133 KB takes about 2.7 s to transfer, before round trips and the TLS
handshake are counted.

---

## Decision

**Stay on the Next.js App Router and accept the ~133 KB floor.** The template's job is to
keep everything above the floor small, and to enforce that in CI.

We stay because of what the App Router gives enterprise adopters today:

- Auth that runs in `proxy.ts` and in server components
- Server Actions for mutations
- The size of its ecosystem
- How familiar teams already are with it

### 1. Route groups decide JavaScript cost

| Group | For | Layout |
|---|---|---|
| `app/(app)/` | Authenticated, read-only routes | Provider-free shell: `Header` + `<main>` |
| `app/(app)/(interactive)/` | Routes that need client state or a client cache | Mounts `StoreProvider` + `QueryProvider` |
| `app/(auth)/` | Auth pages (login) | Minimal shell |

A route pays for Zustand and TanStack Query only if it lives under `(interactive)`. This
refines ADR-003, which mounted both providers in `app/(app)/layout.tsx`.

### 2. A per-route JavaScript budget, checked in CI

- `pnpm check:budget` runs `scripts/check-bundle-budget.mjs`.
- Budgets live in `scripts/bundle-budget.json`. There is one budget per group (`read` and
  `interactive`), and individual routes can override it.
- CI fails when a route goes over its budget.

This replaces the route-size table that Next 16 no longer prints.

### 3. Defaults that keep pages light

- The login form is a server-rendered `<form action={loginAction}>`. It works before
  JavaScript loads.
- The `Link` adapter in `src/shared/ui` turns off prefetch when the browser reports
  Save-Data or a 2g connection.
- `browserslist` is set explicitly in `package.json`. It starts from Next's defaults
  (chrome 111, edge 111, firefox 111, safari 16.4). Adopters pick their targets from real
  audience data.

---

## Alternatives considered

### Astro with React islands (MIT)

Astro renders pages to HTML and ships no JavaScript unless a component is marked as an
island. A static page costs 0 KB of JS. React components can be used as islands, and each
island loads only its own code plus React.

- **Better than Next for:** apps that are mostly read-only content, such as documentation,
  catalogues, reports and intranets with a few interactive widgets. On these, Astro beats
  the App Router by the full ~133 KB on every static page.
- **Why we did not choose it as the template's base:** furio-kit targets authenticated
  enterprise apps with forms, mutations and role checks. In those apps, the App Router's
  auth integration, Server Actions and ecosystem matter more than the floor. Switching
  would also mean rebuilding the template's layering, auth adapters and generators.

### React Router v7, framework mode (MIT)

It offers server rendering, loaders and actions, and forms that work without JavaScript.
Every page that hydrates still ships React, React DOM and the router. We did not measure a
React Router build, so we make no claim about its floor compared with Next. Moving to it
would mean rewriting the server-component layering this template is built on.

### Next.js Pages Router

It is the same framework, without React Server Components. Every page component is
hydrated, so application code that RSC keeps on the server today would ship to the client.
We did not measure its floor. New Next.js features land in the App Router first, so
building a new template on the Pages Router would be a step backwards.

---

## Consequences

**Positive:**

- Teams keep the App Router's auth, Server Actions and ecosystem.
- JavaScript above the floor is visible and capped per route. Regressions fail CI instead
  of being found by users on slow links.
- Read-only routes no longer pay ~9 KB for providers they do not use.
- Where a route goes (read vs interactive) is a visible decision, made when the route is
  created.

**Negative / trade-offs:**

- Every page costs at least ~133 KB gzip. On a 400 kbps link, that is about 2.7 s of
  transfer on the first visit. Repeat visits are cheaper, because the chunks are
  content-hashed and cached as immutable.
- Nested route groups add a concept that new developers must learn.
- A route that later needs client state has to move from `(app)` to `(app)/(interactive)`.
  The URL does not change; the file path does.
- Budgets need upkeep. A Next or React upgrade can move the floor, and then the budgets
  need adjusting.

---

## When to revisit

Revisit this decision if any of these happen:

- Next.js ships a supported zero-JS or partial-hydration mode for App Router pages.
- A Next or React upgrade moves the measured floor by more than ~10 KB, in either
  direction.
- Adopters report that most of their routes end up in `(app)` with no interactive needs.

### When an adopter should choose Astro instead

Choose Astro with React islands if **most of your pages are read-only content**, and:

- your users are mostly on slow or metered connections, and
- you do not need Server Actions or the App Router's auth integration across most pages.

For an app like that, furio-kit's floor is a cost you pay on every page for features you
barely use. Astro is the better fit, and choosing it is not a failure to follow the
template.

---

## Implementation notes

- See [`docs/wiki/10-performance.md`](../wiki/10-performance.md) for the practical guide:
  where to put a route, how to read the budget, prefetch, caching and service workers.
- `pnpm generate route` asks whether a route is read-only or interactive, and places it in
  the matching group.
- `pnpm check:arch` runs dependency-cruiser (MIT) import-graph architecture checks.

---

## Acceptance criteria

- [ ] `app/(app)/layout.tsx` mounts no providers (only `Header` and `<main>`)
- [ ] `app/(app)/(interactive)/layout.tsx` mounts `StoreProvider` + `QueryProvider`
- [ ] `pnpm check:budget` exists, reads budgets from `scripts/bundle-budget.json`, and
      fails CI on breach
- [ ] `/` (read group) ships no TanStack Query or Zustand code
- [ ] `browserslist` is explicit in `package.json`
- [ ] `docs/wiki/10-performance.md` documents the floor, route groups and budget
