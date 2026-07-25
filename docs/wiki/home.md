# furio-kit Wiki

furio-kit is an enterprise React boilerplate by FurioLabs. It gives teams a production-ready starting point built on Next.js 16+ App Router with React Server Components as the default rendering model, Feature-Sliced Design (FSD) for enforced layer boundaries, and a mandatory adapter pattern that decouples your application from any specific design system (`@org/ui-kit`). Fork it, drop in your organization's UI kit, and ship features instead of scaffolding.

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| Next.js | 16+ | App Router, Turbopack dev server, Server Actions |
| React | 19+ | React Compiler, Server Components by default |
| TypeScript | 5+ | Strict mode |
| pnpm | 10+ | Package manager |
| Biome | 2+ | Lint + format (replaces ESLint + Prettier) |
| Tailwind CSS | v4 | Utility-first styling, no config file |
| `@tailwindcss/postcss` | v4 | Required PostCSS plugin for Tailwind v4 |
| TanStack Query | v5 | Client-side cache, optimistic updates |
| Zustand | v5 | Client UI state (SSR-safe factory pattern) |
| Zod | v4 | Runtime schema validation at system boundaries |
| Vitest | v4 | Unit and integration tests |
| `@org/ui-kit` | org-supplied | External design system (Atoms + Molecules) |

## Guides

| # | Page | What it covers |
|---|---|---|
| 1 | [Getting Started](./01-getting-started.md) | Bootstrap, environment setup, first run, removing starter content |
| 2 | [Architecture](./02-architecture.md) | FSD layers, import rules, RSC model, data flow, naming conventions |
| 3 | [Adding Features](./03-adding-features.md) | End-to-end walkthrough: entity → feature → widget → view → route |
| 4 | [Design System](./04-design-system.md) | Adapter pattern, writing adapters, RSC compatibility, token integration |
| 5 | [Auth](./05-auth.md) | Auth adapter architecture, switching providers, route protection, testing locally |
| 6 | [State Management](./06-state-management.md) | Decision matrix, Server Actions, TanStack Query, Zustand, anti-patterns |
| 7 | [Testing](./07-testing.md) | What to test per layer, co-location, RTL patterns, Vitest config |
| 8 | [CI & Automation](./08-ci-automation.md) | GitHub Actions workflows, architecture guard, Dependabot, Claude Code triggers |
| 9 | [Extending the Template](./09-extending.md) | Adding generators, workflows, hooks, upgrading majors, upstream sync |
| 10 | [GitNexus](./10-gitnexus.md) | ⚠️ **Deprecated** — removed 2026-07-25. Retained for historical reference; see [Code Intelligence](#code-intelligence) below |

## Where to Find What

| Question | Go here |
|---|---|
| How do I set up the project? | [Getting Started](./01-getting-started.md) |
| What are the FSD layer rules and import boundaries? | [Architecture](./02-architecture.md) |
| How do I build a new page end-to-end? | [Adding Features](./03-adding-features.md) |
| How do I integrate my organization's design system? | [Design System](./04-design-system.md) |
| How do I add or switch authentication providers? | [Auth](./05-auth.md) |
| When do I use TanStack Query vs Zustand vs Server Actions? | [State Management](./06-state-management.md) |
| How do I write tests for Server Components or adapters? | [Testing](./07-testing.md) |
| How does the CI pipeline work? What does the architecture guard check? | [CI & Automation](./08-ci-automation.md) |
| How do I add a Plop generator or new GitHub Actions workflow? | [Extending the Template](./09-extending.md) |
| What are the full technical rules for AI assistants (Claude Code)? | [`CLAUDE.md`](../../CLAUDE.md) |
| How do all AI assistants behave in this repo? | [`AGENTS.md`](../../AGENTS.md) |
| How do I contribute a PR, use worktrees, or run the generators? | [`CONTRIBUTING.md`](../../CONTRIBUTING.md) |
| Where do I start as a first-time visitor? | [`README.md`](../../README.md) |
| How do I understand code, trace bugs, or assess impact? | [Code Intelligence](#code-intelligence) below |

## Code Intelligence

**GitNexus was removed from furio-kit on 2026-07-25.** The [GitNexus page](./10-gitnexus.md) remains only as historical reference.

**It was dropped for licensing reasons.** GitNexus is distributed under the [PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/), which permits use only for noncommercial purposes. furio-kit is MIT-licensed and exists to be cloned and deployed as a commercial enterprise frontend.

That alone would be a conflict, but the integration made it worse: `CLAUDE.md`, `AGENTS.md`, and the Copilot instructions **mandated** GitNexus tools with `MUST`/`NEVER` rules before every edit and commit. Any organization using this boilerplate commercially and following its own required workflow would have been using a noncommercial-licensed tool commercially. A permissively licensed template must not induce its adopters into a license violation. No technical fix addressed this — only removal did.

Code intelligence is now provided by two **optional**, per-developer MCP servers:

| Server | Lane |
|---|---|
| codebase-memory-mcp | Call graph and relationships — `trace_path`, `search_graph`, `get_architecture`, `detect_changes` |
| Serena | LSP symbol precision — exact definitions, references, safe renames |

Neither is required, neither is mandated by any rule, and neither ships with the boilerplate — each developer installs them individually if they want them. Every task in this repo must remain doable with plain file reading and search. That is deliberate: it is what keeps a developer-tooling choice from becoming a licensing obligation for everyone downstream. See the **Code Intelligence** section of [`CLAUDE.md`](../../CLAUDE.md) for the precedence rules that decide which to reach for.

> **When adding any code-intelligence tool to this project, check its license first.** Anything mandated by the instruction files effectively becomes a requirement for every organization deploying furio-kit commercially.
