# furio-kit

Enterprise React boilerplate by FurioLabs. Built on Next.js 16 App Router with React Server Components, Feature-Sliced Design, and a pluggable `@org/ui-kit` design system adapter.

## Requirements

- Node.js 20+
- pnpm 9+

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Start production server (requires `pnpm build` first) |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm audit` | Check for vulnerable dependencies |

## Connecting your design system

This boilerplate expects a `@org/ui-kit` package from your organization. Until it is installed, adapter components in `src/shared/ui/` use Tailwind-based placeholders.

To connect your design system:

1. Install your package:
   ```bash
   pnpm add @your-org/ui-kit
   ```

2. Update each adapter in `src/shared/ui/` to import from your package instead of the placeholder implementation. Each adapter file contains a comment showing the exact replacement.

## Security

Vulnerability scanning runs automatically on every push and PR via GitHub Actions (`.github/workflows/audit.yml`). Dependabot opens weekly PRs to keep dependencies current (`.github/dependabot.yml`).

To audit locally:

```bash
pnpm audit
pnpm audit --fix   # auto-fix where possible
```
