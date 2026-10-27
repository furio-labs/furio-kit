# ADR-010: Content Security Policy and Nonces

**Date:** 2026-10-26
**Status:** Accepted
**Priority:** Medium
**Deciders:** FurioLabs engineering team

---

## Context

`next.config.ts` sends a static `Content-Security-Policy` header on every response
(ADR-001). Its script directive is:

```
script-src 'self' 'unsafe-inline'
```

`'unsafe-inline'` is there because Next.js inlines small scripts into every page, such as
the bootstrap code and the RSC payload. Without it, or without some other way to allow
those scripts, pages break.

`'unsafe-inline'` weakens the CSP as a defence against cross-site scripting (XSS). If an
attacker gets markup injected into a page, the browser will run an inline `<script>` from
it.

The standard fix is a **nonce**: a random value created for each request. The value goes
in the CSP header (`'nonce-<value>'`) and on every legitimate `<script>` tag. The browser
runs only scripts that carry the right nonce. Next.js's "Content Security Policy" guide
describes how to do this with the proxy (formerly middleware).

The cost is in rendering. A nonce has to be different on every request, so the HTML cannot
be generated once at build time. Every page that uses a nonce must **render dynamically**.
That means:

- no static prerendering of HTML
- no CDN caching of the HTML
- server work and time-to-first-byte on every request

Pages like `/403` are prerendered today and could be served from a CDN edge. For a
template built for low-bandwidth, high-latency users, losing that is a real cost.

---

## Decision

**Keep the current static CSP header for the template.** Document the nonce-based approach
for adopters with stricter security requirements.

The template's default favours static rendering and CDN caching. Other controls already
lower the XSS risk:

- React escapes rendered output by default.
- `dangerouslySetInnerHTML` requires DOMPurify (CLAUDE.md, Security).
- Inputs are validated with Zod at every system boundary.

An adopter whose security policy forbids `'unsafe-inline'` should switch to nonces, using
the outline below and Next's "Content Security Policy" guide.

---

## How to switch to nonces

This is an outline. Follow Next's "Content Security Policy" guide for the exact current API.

### 1. Remove the CSP from `next.config.ts`

Delete the `Content-Security-Policy` entry from `securityHeaders`. Keep the other headers.
If both stay, the browser enforces both policies, and the static one still allows
`'unsafe-inline'`.

### 2. Generate the nonce and CSP in `proxy.ts`, on every request

Build the nonce **before** the early return for public paths. If you build it after,
`/login`, `/403` and `/api/auth` get no nonce, and `/login` is the page that most needs
to work before and during JavaScript loading.

```ts
// proxy.ts (outline)
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res
  }

  if (isPublic(request.nextUrl.pathname)) return next()
  // ...existing auth check and redirect...
  // ...set x-request-id on the response returned by next()...
  return next()
}
```

Next reads the nonce from the request's CSP header and adds it to the scripts it renders.
Your own `<Script>` tags or inline scripts need the nonce passed in. Read it with
`(await headers()).get('x-nonce')` in a server component.

### 3. Make the pages dynamic

Pages that would otherwise be prerendered must render per request, or they will carry a
stale nonce, or none at all. Reading request headers (for example, `await headers()`) or
calling `await connection()` from `next/server` opts a route into dynamic rendering.
Check the guide for the current recommended way.

### 4. Leave styles as they are

Nonces here cover scripts. `style-src 'unsafe-inline'` stays, because Tailwind and many UI
kits rely on inline styles. Tightening styles is a separate decision.

### 5. Verify

Build and run the production server. Check the browser console on every route group for
CSP violations. Confirm that `/login` still works with JavaScript disabled.

### Alternative to look at

Next's guide also describes hash-based protection (Subresource Integrity), which can keep
pages static. When this ADR was written it was an experimental option. Check its status
in the current guide before you rely on it.

---

## Consequences

**Positive:**

- The template keeps static prerendering and CDN caching of HTML where routes allow it.
- The cost of the stricter option is written down, so adopters can make an informed choice.

**Negative / trade-offs:**

- The default CSP allows inline scripts. It protects less against injected-markup XSS than
  a nonce-based CSP does.
- Adopters who switch take on per-request rendering for every page, and must keep
  `proxy.ts` and the CSP in sync themselves.

---

## When to revisit

- Next.js ships a stable way to get a strict script CSP on static pages (for example, a
  stable hash-based option).
- The template's default routes become dynamic anyway (for example, every page reads the
  session). Then nonces would cost little, and the default should switch.

---

## Acceptance criteria

- [x] `next.config.ts` keeps the static CSP header (no code change)
- [x] This ADR documents the trade-off and the nonce migration outline
- [x] `docs/wiki/10-performance.md` mentions that nonces force dynamic rendering
