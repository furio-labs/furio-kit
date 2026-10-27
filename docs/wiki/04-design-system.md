# Design System Integration

furio-kit doesn't care where your components come from. They can be an npm package your organization publishes, or source files a tool like shadcn/ui, v0 or an AI assistant generated into the repo. Either way you plug them in by changing **one line** in `package.json`. Features, entities, widgets and views keep importing from `@/shared/ui` and never notice.

---

## How it fits together

```
package.json  "imports": { "#ui-kit": "<active kit entry>" }
    |
    v
src/shared/ui/kit/<name>/index.ts       the kit: Button, Card, ... (styling lives here)
    |
    v
src/shared/ui/Button/Button.tsx         adapters: import from '#ui-kit', map props
src/shared/ui/Card/Card.tsx
src/shared/ui/Link/Link.tsx             (wraps next/link, not the kit)
    |
    v
features / entities / widgets / views   import { Button } from '@/shared/ui'
```

Three pieces, each with one job:

| Piece | Where | Job |
|---|---|---|
| **Kit** | `src/shared/ui/kit/<name>/` | The actual components and their styling |
| **Alias** | `package.json` → `"imports"` → `#ui-kit` | Picks the active kit at build time |
| **Adapters** | `src/shared/ui/<Name>/` | The stable API the app uses (`ButtonProps`, `CardProps`…); maps it to the kit |

The kit must satisfy [`src/shared/ui/kit/CONTRACT.md`](../../src/shared/ui/kit/CONTRACT.md): the exports and props each adapter expects, and the semantic tokens. Hand that file to a person or an AI design tool as the spec for a compatible kit.

`#ui-kit` is a standard Node.js [subpath import](https://nodejs.org/api/packages.html#subpath-imports). TypeScript (`moduleResolution: bundler`), Turbopack and Vitest all resolve it from `package.json` with no extra config.

---

## The default kit

furio-kit ships a placeholder kit in `src/shared/ui/kit/default/`, and the alias points at it:

```json
"imports": {
  "#ui-kit": "./src/shared/ui/kit/default/index.ts"
}
```

It is plain Tailwind built on the semantic tokens (see [Tokens](#tokens)). You can ship with it, restyle it, or replace it.

---

## Mode 1: source kit (shadcn/ui, v0, AI-generated)

Use this mode when the components live as source in your repo.

1. Generate or copy the components into a new folder, e.g. `src/shared/ui/kit/acme/`.
2. Add `src/shared/ui/kit/acme/index.ts` that exports the names in `CONTRACT.md`. If a component uses different names or props, re-export or wrap it here:

   ```ts
   // src/shared/ui/kit/acme/index.ts
   export { Button } from './button'
   export { Card } from './card'
   ```

3. Point the alias at it:

   ```json
   "imports": { "#ui-kit": "./src/shared/ui/kit/acme/index.ts" }
   ```

4. Run `pnpm exec tsc --noEmit && pnpm build`. A missing export or wrong prop type fails here, not at runtime.

You can keep `kit/default/` around for comparison or delete it once you have switched.

## Mode 2: package kit (`@org/ui-kit` from npm)

Use this mode when your organization publishes its design system as a package.

1. `pnpm add @org/ui-kit`
2. Create `src/shared/ui/kit/org/index.ts`, re-exporting the contract names:

   ```ts
   // src/shared/ui/kit/org/index.ts
   export { Button, Card } from '@org/ui-kit'
   // or, when names differ:
   // export { PrimaryButton as Button, Panel as Card } from '@org/ui-kit'
   ```

3. Point the alias at it:

   ```json
   "imports": { "#ui-kit": "./src/shared/ui/kit/org/index.ts" }
   ```

4. If the package ships a stylesheet, import it in `app/globals.css` and map its variables to the semantic tokens (see below).
5. Run `pnpm exec tsc --noEmit && pnpm build`.

When the package's props differ more than a rename can fix (say it takes `intent` where the contract says `variant`), map them in the adapter. That is the one place where the kit's API meets the app's:

```tsx
// src/shared/ui/Button/Button.tsx
import { Button as KitButton } from '#ui-kit'

export function Button({ variant = 'primary', ...rest }: ButtonProps) {
  return <KitButton intent={variant === 'ghost' ? 'subtle' : variant} {...rest} />
}
```

Only `src/shared/ui/**` may import `#ui-kit`, `src/shared/ui/kit/**` or `@org/ui-kit`. Everything else imports `@/shared/ui`.

---

## Tokens

The kit styles itself with **semantic** Tailwind classes such as `bg-primary`, `text-primary-foreground`, `border-border` and `rounded-control`, never palette classes such as `bg-blue-600`. The tokens are declared once in `app/globals.css`:

```css
@import "tailwindcss";

@theme static {
  --color-primary: oklch(54.6% 0.245 262.881); /* blue-600 */
  --color-primary-hover: oklch(48.8% 0.243 264.376);
  --color-primary-foreground: #fff;
  --color-surface: #fff;
  --color-border: oklch(92.8% 0.006 264.531);
  /* ...full list in CONTRACT.md */
  --radius-control: 0.375rem;
  --radius-surface: 0.5rem;
}
```

Tailwind v4 turns each `--color-*` into `bg-*`, `text-*` and `border-*` utilities, and each `--radius-*` into `rounded-*`. `static` makes Tailwind always emit the variables, so a kit's own CSS can use `var(--color-primary)` too.

To re-brand, change the values. To adopt a package's tokens, point the values at its variables:

```css
@import "tailwindcss";
@import "@org/ui-kit/tokens.css";

@theme static {
  --color-primary: var(--org-color-primary);
  --color-surface: var(--org-color-surface);
  --radius-control: var(--org-radius-sm);
}
```

If the package only exports a JS `tokens` object, copy the values in and note the source token name in a comment (`/* tokens.color.primary */`) so updates are easy to track.

App code outside the kit should also use semantic classes, so a re-brand reaches it.

---

## Link: data-saving prefetch

`Link` from `@/shared/ui` wraps `next/link`. By default `next/link` prefetches every link that scrolls into view, which spends data the user didn't ask for on slow or metered connections. The adapter turns prefetch off when the browser reports Save-Data (`navigator.connection.saveData`) or a `slow-2g`/`2g` connection. Otherwise it passes your `prefetch` prop through unchanged. It is a small Client Component: measured at about 0.4 KB gzip per page.

```tsx
import { Link } from '@/shared/ui'

<Link href="/reports" className="text-primary hover:underline">Reports</Link>
```

- It takes the same props as `next/link`.
- It is a Client Component, but you can render it from Server Components.
- The server renders it as "unconstrained", then the client corrects it after hydration, so the HTML always matches.
- Browsers without the Network Information API (Safari, Firefox) keep the normal `next/link` behavior.

Use it instead of importing `next/link` directly.

---

## Writing a new adapter

1. Add the primitive to the kit (`src/shared/ui/kit/<name>/Badge.tsx`) and export it from the kit's `index.ts`. Use semantic token classes and `cn()`.
2. Add the props to `CONTRACT.md`.
3. Add the adapter:

   ```tsx
   // src/shared/ui/Badge/Badge.tsx
   import { Badge as KitBadge } from '#ui-kit'

   export interface BadgeProps {
     label: string
     variant?: 'default' | 'danger'
     className?: string
   }

   export function Badge({ label, variant = 'default', className }: BadgeProps) {
     return <KitBadge variant={variant} className={className}>{label}</KitBadge>
   }
   ```

   ```ts
   // src/shared/ui/Badge/index.ts
   export { Badge } from './Badge'
   export type { BadgeProps } from './Badge'
   ```

4. Re-export it from `src/shared/ui/index.ts`.
5. Add `Badge.test.tsx` next to it to test the prop mapping.

Mark an adapter `'use client'` only when the adapter itself uses hooks, refs or browser APIs. Taking an `onClick` prop does not need it. An adapter without the directive renders on the server, with no JavaScript, when a Server Component uses it, and is bundled into the client chunk when a Client Component renders it. A package component that needs the client already carries its own `'use client'`.

This matters because Next ships every `'use client'` module a page imports, even through the `@/shared/ui` barrel and even if the page never renders it. One client adapter in the barrel is paid for by every page that imports the barrel. Measured in this repo: a `'use client'` `Button` whose kit uses `cn()` added about 9 KB gzip (mostly `tailwind-merge`) to `/login` and `/403`. For package mode, also add your package to `experimental.optimizePackageImports` in `next.config.ts` so only the components you use are bundled.

Every kit you add later must export the new name too. The build fails if one doesn't.

### Extending an adapter

Behavior the kit lacks (e.g. a `loading` state on `Button`) belongs in the adapter. Document it with a JSDoc comment and don't pass unknown props through to the kit component.

```tsx
export interface ButtonProps {
  // ...
  /** furio-kit extension: disables the button and shows a busy state */
  loading?: boolean
}

export function Button({ loading = false, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <KitButton {...rest} disabled={disabled || loading} className={cn(loading && 'cursor-wait', className)}>
      {children}
    </KitButton>
  )
}
```

---

## Rules summary

| Rule | Rationale |
|---|---|
| Only `src/shared/ui/**` imports `#ui-kit`, `src/shared/ui/kit/**` or `@org/ui-kit` | The kit can be swapped without touching the rest of the app |
| Consumers import from `@/shared/ui`, never from an adapter file | One import path, one public API |
| Kit components use semantic token classes only | Re-branding means changing `globals.css`, not every component |
| Use `cn()` from `@/shared/utils` for all `className` composition | Handles Tailwind class conflicts; never template literals |
| Use `Link` from `@/shared/ui`, not `next/link` | Respects Save-Data and 2G connections |
| Every adapter is re-exported from `src/shared/ui/index.ts` with its `Props` type | Consumers can type props without importing the component |

### Upgrading from the connection flag

Earlier versions used `NEXT_PUBLIC_UI_KIT_CONNECTED=true` to make placeholder adapters throw at render time until you hand-edited each one. That flag no longer does anything. Swapping kits is now a build-time alias change, and a kit that doesn't satisfy the contract fails the build instead. Remove the variable from your environments.
