#!/usr/bin/env bash
# Build the test fixtures, check formatting, and run the Playwright browser tests.
# Exits nonzero if any step fails.
set -euo pipefail

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd -- "$here/.." && pwd)"

cd "$root"
lake test
lake exe test-fixtures-build

# Every .js file under web-lib/ must be listed in some jsconfig.json.
"$here/check-jsconfig-coverage.sh"

# Type-check the JS bundles that have a full set of declarations available.
npx --no-install tsc --noEmit -p web-lib/animate/jsconfig.json
npx --no-install tsc --noEmit -p web-lib/panel/jsconfig.json
npx --no-install tsc --noEmit -p web-lib/vir-panel/jsconfig.json
npx --no-install tsc --noEmit -p demos/vir-pretty/web/jsconfig.json
npx --no-install tsc --noEmit -p web-lib/service-worker/jsconfig.json
npx --no-install tsc --noEmit -p web-lib/widget/jsconfig.json
npx --no-install tsc --noEmit -p web-lib/math/jsconfig.json
npx --no-install tsc --noEmit -p web-lib/vir-prettym/jsconfig.json

# Check prettier formatting for all git-tracked files (respects .prettierignore
# and prettier's own "can this file be formatted?" heuristic).
git ls-files -z | xargs -0 npx --no-install prettier --check --ignore-unknown

cd "$root/browser-tests"
# `-n auto` hits Chromium timeouts on machines with many cores because of
# browser-process contention. Four workers is a reliable default that still
# gives a 3–4× speedup; override with `PYTEST_WORKERS=... scripts/test.sh`.
uv run pytest -n "${PYTEST_WORKERS:-4}" "$@"
