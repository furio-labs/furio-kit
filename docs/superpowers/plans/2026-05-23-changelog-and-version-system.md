# Changelog & Version System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automated changelog generation and GitHub Release publishing via release-please so template users can discover security patches and feature updates.

**Architecture:** Three new files only — a release-please config, a version manifest seeded at `0.1.0`, and a GitHub Actions workflow. No code changes, no new npm dependencies. The action opens a Release PR on every push to `main`; merging it creates a GitHub Release + tag.

**Tech Stack:** `googleapis/release-please-action@v4` (GitHub Action), Conventional Commits (already in use)

---

### Task 1: release-please config and manifest

**Files:**
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`

- [ ] **Step 1: Create `release-please-config.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "changelog-sections": [
    { "type": "security", "section": "🔒 Security",      "hidden": false },
    { "type": "feat",     "section": "Features",         "hidden": false },
    { "type": "fix",      "section": "Bug Fixes",        "hidden": false },
    { "type": "build",    "section": "Build System",     "hidden": false },
    { "type": "refactor", "section": "Code Refactoring", "hidden": false },
    { "type": "perf",     "section": "Performance",      "hidden": false },
    { "type": "docs",     "section": "Documentation",    "hidden": false },
    { "type": "chore",    "hidden": true },
    { "type": "test",     "hidden": true },
    { "type": "ci",       "hidden": true },
    { "type": "style",    "hidden": true }
  ],
  "packages": { ".": {} }
}
```

- [ ] **Step 2: Create `.release-please-manifest.json`**

```json
{ ".": "0.1.0" }
```

This seeds the current version so the first release bumps to `0.1.1` (patch) or `0.2.0` (feat), not `1.0.0`.

- [ ] **Step 3: Validate both JSON files**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('release-please-config.json','utf8')); console.log('config ok')"
node -e "JSON.parse(require('fs').readFileSync('.release-please-manifest.json','utf8')); console.log('manifest ok')"
```

Expected output:
```
config ok
manifest ok
```

- [ ] **Step 4: Commit**

```bash
git add release-please-config.json .release-please-manifest.json
git commit -m "chore: add release-please config and version manifest"
```

---

### Task 2: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/release-please.yml`

- [ ] **Step 1: Create `.github/workflows/release-please.yml`**

```yaml
name: Release Please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

- [ ] **Step 2: Verify YAML is well-formed**

Run:
```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/release-please.yml','utf8')); console.log('yaml ok')"
```

Expected output:
```
yaml ok
```

`js-yaml` is already available via `vitest`'s transitive dependencies. If the command fails with "Cannot find module", run `node -e "require('fs').readFileSync('.github/workflows/release-please.yml','utf8'); console.log('file ok')"` instead — YAML syntax errors would surface as GitHub Actions parse errors on push.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release-please.yml
git commit -m "ci: add release-please workflow for automated changelog and releases"
```

---

### Task 3: Update docs

**Files:**
- Modify: `docs/wiki/08-ci-automation.md` — add release-please to the workflows table and document the `security:` commit type
- Modify: `CONTRIBUTING.md` — add `security:` to the commit convention section

- [ ] **Step 1: Add release-please to the CI automation wiki**

In `docs/wiki/08-ci-automation.md`, update the workflows table under **Section 1** to add a new row after the Stale row:

```markdown
| Release Please | `release-please.yml` | push to `main` | Opens/updates a Release PR that bumps `package.json` version and updates `CHANGELOG.md`; merging the PR creates a GitHub Release and tag | No |
```

Then add a new **Section 7** (before the existing Copilot section, renumber Copilot to 8) titled `## 7. Release Please` with this content:

```markdown
## 7. Release Please

`release-please.yml` runs on every push to `main`. It reads Conventional Commits since the last release and opens (or updates) a single "Release PR" titled `chore(main): release X.Y.Z`. The PR contains:

- A `package.json` version bump
- An updated `CHANGELOG.md` with entries grouped by commit type

Merging the Release PR triggers a second run that creates a GitHub Release and git tag (`vX.Y.Z`). Template users who have enabled "Watch → Releases" on the repository receive a GitHub notification at this point.

### Version bump rules

| Commit type | Bump |
|---|---|
| `security:`, `fix:`, `build:`, `chore:` | patch (0.1.0 → 0.1.1) |
| `feat:` | minor (0.1.0 → 0.2.0) |
| `feat!:` or `BREAKING CHANGE:` footer | major (0.1.0 → 1.0.0) |

### Security commit type

Use `security:` (not `fix:`) for security patches. Entries of this type appear in a dedicated `🔒 Security` section at the top of the changelog, making them easy to spot when template users decide whether to apply a change.

```
security: update next to patch CVE-2025-XXXX
security: sanitize user input in search-action to address GHSA-xxxx-xxxx-xxxx
```

When Dependabot opens a PR that is security-driven (an advisory, not a routine version bump), rename the PR title from `build(deps): bump X` to `security: bump X to patch GHSA-…` before merging.

### Configuration files

| File | Purpose |
|---|---|
| `release-please-config.json` | Changelog section order and visibility |
| `.release-please-manifest.json` | Tracks the last released version |
| `CHANGELOG.md` | Auto-generated; do not edit by hand |
```

- [ ] **Step 2: Add the `security:` commit type to CONTRIBUTING.md**

In `CONTRIBUTING.md`, locate the `## Commands` section at the bottom. Before it, add a new section:

```markdown
## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/). The `release-please` workflow reads commit types to determine the version bump and populate the changelog.

| Type | When to use | Changelog section |
|---|---|---|
| `security:` | Security patch (CVE, advisory, sanitization fix) | 🔒 Security — always at the top |
| `feat:` | New capability | Features |
| `fix:` | Bug fix | Bug Fixes |
| `build(deps):` | Dependency update (Dependabot) | Build System |
| `refactor:` | Internal restructure, no behavior change | Code Refactoring |
| `perf:` | Performance improvement | Performance |
| `docs:` | Documentation only | Documentation |
| `chore:` | Maintenance (hidden from changelog) | — |
| `ci:` | CI/CD changes (hidden from changelog) | — |

**Security PRs:** When Dependabot opens a PR for a security advisory, rename its title from `build(deps):` to `security:` before merging so it appears in the `🔒 Security` section.

**Breaking changes:** Add `!` after the type (`feat!:`) or a `BREAKING CHANGE:` footer to trigger a major version bump.

```

- [ ] **Step 3: Commit**

```bash
git add docs/wiki/08-ci-automation.md CONTRIBUTING.md
git commit -m "docs: document release-please workflow and security commit convention"
```

---

### Task 4: Push and verify

- [ ] **Step 1: Push to main**

```bash
git push
```

- [ ] **Step 2: Verify the workflow appears in GitHub Actions**

Open the repository on GitHub → Actions tab → confirm "Release Please" appears in the workflow list and has run (or is running) on the push.

- [ ] **Step 3: Confirm no Release PR yet (expected)**

Because the commits pushed (`chore:`, `ci:`, `docs:`) are all hidden types in the changelog, release-please will not open a Release PR for this push — it only acts on visible commit types. This is correct behavior.

To verify a Release PR would be created: make any `feat:` or `fix:` commit to `main` (or merge a PR with such a commit). A PR titled `chore(main): release 0.2.0` (or `0.1.1`) will appear within ~1 minute of the push completing.
