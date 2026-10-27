#!/usr/bin/env bash
set -uo pipefail

# Pre-push hook for Claude Code (optional tooling — CI runs the same checks in
# .github/workflows/architecture-guard.yml, so nothing depends on this hook).
# Fires on PreToolUse when Claude runs "git push".
# Runs the import-graph rules (dependency-cruiser, .dependency-cruiser.cjs) and
# the barrel-export check over the whole project.
# Exit 0 = allow, Exit 2 = block (any other non-zero exit would NOT block).

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0

ERRORS=""

if ! OUTPUT=$(pnpm --silent check:arch --output-type err 2>&1); then
  ERRORS="${ERRORS}${OUTPUT}\n"
fi

if ! OUTPUT=$(node scripts/check-barrels.mjs 2>&1); then
  ERRORS="${ERRORS}${OUTPUT}\n"
fi

if [ -n "$ERRORS" ]; then
  printf "Architecture violations found. Fix before pushing:\n\n%b" "$ERRORS" >&2
  exit 2
fi

exit 0
