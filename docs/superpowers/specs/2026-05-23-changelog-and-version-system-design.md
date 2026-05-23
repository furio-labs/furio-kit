# Changelog & Version System Design

**Date:** 2026-05-23
**Status:** Approved

## Goal

Add automated changelog generation and GitHub Release publishing to furio-kit so that organizations using the boilerplate as a template can discover security patches and feature updates without tracking the git log manually.

## Context

furio-kit is consumed as a GitHub template repository. Teams use "Use this template" to bootstrap their project and then diverge. There is no npm publishing and no git upstream relationship. The only update discovery mechanism available to template users is GitHub's "Watch → Releases" notification. The repo already follows Conventional Commits consistently.

## Approach

Use **`release-please`** (Google) as a pure GitHub Action. No new npm dependencies. After every merge to `main`, the action opens or updates a "Release PR" that bumps `package.json` version and updates `CHANGELOG.md`. Merging that PR creates a GitHub Release and tag, triggering notifications for watching users.

## Files Added

| File | Purpose |
|---|---|
| `.github/workflows/release-please.yml` | GitHub Action — runs on push to main |
| `release-please-config.json` | Changelog sections, repo type |
| `.release-please-manifest.json` | Version seed (`0.1.0`) |
| `CHANGELOG.md` | Auto-generated on first release |

No existing files are modified.

## Release Flow

```
git push to main
  → release-please action runs
  → opens/updates Release PR ("chore(main): release 0.X.Y")
      • package.json version bumped
      • CHANGELOG.md updated with grouped entries
  → maintainer merges Release PR
  → GitHub Release + tag created (v0.X.Y)
  → watching template users notified
```

## Changelog Sections

Sections are ordered by priority. `🔒 Security` is always first and always visible.

| Commit type | Section | Visible |
|---|---|---|
| `security:` | 🔒 Security | yes |
| `feat:` | Features | yes |
| `fix:` | Bug Fixes | yes |
| `build:` | Build System | yes |
| `refactor:` | Code Refactoring | yes |
| `perf:` | Performance | yes |
| `docs:` | Documentation | yes |
| `chore:` | — | hidden |
| `test:` | — | hidden |
| `ci:` | — | hidden |
| `style:` | — | hidden |

## Security Commit Convention

A new `security:` commit type is introduced alongside existing conventional commit types.

**Format:**
```
security: patch X for CVE-YYYY-NNNN
security: update Y to address GHSA-xxxx-xxxx-xxxx
```

**Dependabot security PRs:** When Dependabot opens a PR that is security-driven (not just a routine version bump), rename the PR title from `build(deps):` to `security:` before merging. This is the only manual step in the process.

## Version Bumping Rules

release-please follows semver based on commit types:

| Trigger | Bump |
|---|---|
| `fix:`, `security:`, `build:`, `chore:` | patch (0.1.0 → 0.1.1) |
| `feat:` | minor (0.1.0 → 0.2.0) |
| `BREAKING CHANGE:` footer or `feat!:` | major (0.1.0 → 1.0.0) |

## Permissions

The workflow uses the built-in `GITHUB_TOKEN` (no PAT required). Permissions are scoped to the job:

- `contents: write` — to push the CHANGELOG and create releases
- `pull-requests: write` — to open the Release PR

## Out of Scope

- npm publishing (package is `private: true`)
- Automatic merging of the Release PR (intentional — maintainer reviews what ships)
- Notifying existing template forks directly (GitHub does not support this; Watch/Releases is the mechanism)
