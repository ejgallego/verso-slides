# Historical Slides 51c6d782 qualification

These logs were executed locally at Slides
`51c6d782285845c4c9dee5f2f1852051cdaffede` with pinned VIR
`47e82e9a483e727431bb004fb64ce76ada739ba9`, supplied runtime `401b115e` and
pure Except/v2 program `97b280b7`. They are retained from the preceding campaign;
they were not rerun for the cleanup-reporting slice.

| Evidence | Result |
| --- | --- |
| [Native log](native.log) | 101 checks pass |
| [Node log](js-consumer.log) | 11 tests pass |
| [Browser log](browser-checkpoint.log) | 30 Chromium/Firefox checks pass, 5 deselected |
| [Identity/command ledger](identities.json) | Exact full source/artifact IDs, commands and file hashes |

The ledger includes original local artifact paths and earlier development log
hashes for provenance; those files are not prerequisites for reading these retained
results. Source/tests are available at the named commit. The supplied pack is a
build prerequisite; `source: "-"` does not qualify anonymous acquisition.
Native/browser corpus generation commands and scopes are in
[the bounds checkpoint](../../vir-prettym-bounds.md). No Slides CI is inferred
from these local checks.
