# UI kit contract

The spec a kit must satisfy to plug into furio-kit — whether a person writes it, an AI design tool (v0, shadcn, Claude…) generates it, or it re-exports an npm package. The active kit is whatever `#ui-kit` resolves to (`package.json` → `"imports"`). Only the adapters in `src/shared/ui/<Name>/` import it.

## 1. Exports

The kit's entry module must export these named components. A missing export fails `pnpm build` and `tsc`.

```ts
export function Button(props: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' // default 'primary'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'       // default 'button'
  className?: string                         // merged last, via cn()
}): ReactNode

export function Card(props: {
  children: ReactNode
  className?: string
}): ReactNode
```

If your kit's names or props differ (e.g. `intent` instead of `variant`), don't change the app: re-export under the names above from the kit entry, or map the props in the adapter (`src/shared/ui/Button/Button.tsx`).

The app-facing props are the adapters' `ButtonProps`, `CardProps` and `LinkProps`. `Link` is not part of the kit: it wraps `next/link` and only takes styling through `className`.

## 2. Tokens

Kit components style themselves with semantic Tailwind classes only (`bg-primary`, `text-muted-foreground`, `border-border`, `rounded-control`), never palette classes (`bg-blue-600`). The tokens are defined in `app/globals.css` under `@theme static` and are also available as CSS variables (`var(--color-primary)`).

| Token | Class examples | Use |
|---|---|---|
| `--color-background` / `--color-foreground` | `bg-background`, `text-foreground` | Page background, default text |
| `--color-surface` | `bg-surface` | Cards, header, panels |
| `--color-border` | `border-border` | Dividers, outlines |
| `--color-muted` / `--color-muted-foreground` | `bg-muted`, `text-muted-foreground` | Subtle fills, secondary text |
| `--color-primary` / `-hover` / `-foreground` | `bg-primary`, `hover:bg-primary-hover`, `text-primary-foreground` | Main action |
| `--color-secondary` / `-hover` / `-foreground` | `bg-secondary`, … | Secondary action |
| `--color-ghost-foreground` | `text-ghost-foreground` | Ghost action text |
| `--color-danger` / `-foreground` | `bg-danger`, `text-danger` | Destructive action, errors |
| `--radius-control` | `rounded-control` | Buttons, inputs |
| `--radius-surface` | `rounded-surface` | Cards, panels |

A kit may add tokens. It must not rename or remove these, because app code outside the kit uses them too.

## 3. Rules

- Compose classes with `cn()` from `@/shared/utils`, never template literals.
- Put `'use client'` in a kit file only when that component uses hooks, refs or browser APIs.
- No data fetching, no app imports other than `@/shared/utils`.
