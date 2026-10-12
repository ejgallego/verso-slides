# Ordinary formatter test integration

Exact Slides head db12f3a9bce3a4a202df0c5809b1aaf0464026ba, branch
feat/lean-prettym: three formatter commits above PR83's23daa2e.
VIR tag4.35-rc4 / be01a69d; runtime092a7466/program249096a9 remain unchanged
from the [release qualification](../release435-adoption/README.md).

The fixture builder writes the native corpus beside the ordinary fixtures.
Native/Wasm, presentation and initialization tests use the existing code deck.
The opt-in flag/skip hook and manual site assembly are gone. conftest.py is byte
identical to PR83. Review notes and backlog pointer are outside the landing diff;
only the integration guide remains. TypeScript setup belongs to commit1.

Local execution at the clean final head:

- Native/Node driver and fixture generation PASS (`native-clean-head.log`).
- Ordinary pytest selection, no special flag or site directory: all310 tests
  PASS in179.22s, Chromium and Firefox. This includes26 formatter-focused cases.
- Panel TypeScript, tracked formatting, JS config coverage, copyright and diff
  checks PASS. Automatic corpus equals the prior complete native oracle.
- Production application/JS/dependency bytes equal8af8f36; no runtime/program
  regeneration or new performance qualification is inferred. First/second
  commits were rearranged, not independently executed.

Earlier editing attempts failed because an executable's main was imported into
another main module, then because a helper was outside its registered library.
Both raw logs are retained. The final shared helper is TestFixtures.Pretty in
existing TestFixtures; no new library/build abstraction was introduced.

Existing Python3.10/Playwright environment and installed browser binaries were
used. `lake test -- --no-playwright` exercised the native driver; pytest ran the
same ordinary browser selection used by the driver. Python/browser installation
steps were not repeated. These are local results, not a new PR CI claim or a
scientific geometry/mobile/retention/performance campaign. ledger.json hashes
all other retained files. No source cleanup, merge or release was performed.
