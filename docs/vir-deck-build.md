# Lean formatting through VIR

Lean owns `Std.Format.prettyM`; VIR executes it. JavaScript converts Verso's
compact format, measures available columns and presents text/annotations.

```sh
lake build
lake exe demo-slides
python3 -m http.server --directory _slides
```

Downstream decks keep ordinary `slidesMain`/`Config.outputDir`; see
`examples/default-deck`. The existing `VersoSlides` library owns the formatter,
and `VersoSlidesVendored` embeds the prepared pack through `include_vir_program`.
Its stock Lake configuration selects the formatter once:

```lean
lean_lib VersoSlidesVendored where
  needs := #[vendorAssets, `+VersoSlides.VirPrettyM,
    `@«verso-slides»/VersoSlidesVendored:virResourcePack]
```

The bare module key selects the program; the library's fixed prerequisite prepares
it before embedding. Keep that prerequisite: inclusion reads prepared input, not
current Lake configuration, and cannot detect its later removal. Downstream decks
need no registration or generated-path settings.

VIR prepares resources and supplies files/URLs through `ResourceSet.forSite`.
Slides uses its existing writer. No application recipe, export list, producer
paths, manual manifests or extra libraries are required. The writer's existing
in-place/stale-file/failure behavior is unchanged.

The full-name call is `VersoSlides.VirPrettyM.formatSegments`:

```text
Std.Format → Nat → Nat → Array Pretty.Segment
```

Generated VIR metadata marshals inputs/results. Scalar inputs go directly to
VIR; tag IDs return as BigInts and use exact decimal annotation keys. The Lean
function preserves the trusted generated-input model; budgets are deferred.

Initialization runs once. Static slides/navigation remain usable while selected
expressions show loading or failure; readiness renders the current selection.
A rejected request preserves an active program. A failed runtime closes formatting
without retry or a JavaScript formatter fallback. Document teardown/disposal,
font listeners, additional UI/selector changes and measurement campaigns are
recorded in the [post-landing queue](vir-followups.md).

The exact VIR `49445aa0` pin selects public runtime `e415e41a`. Its owning
library acquires and verifies the prebuilt runtime during the ordinary build;
applications use the URLs returned by `forSite`. No supplied pack or Wasm source
build is required. The review notes record the exact acquisition/test scope.

## Focused checks

```sh
lake test -- --no-playwright
node --test Tests/pretty-presentation.test.cjs Tests/vir-bootstrap.test.cjs
lake exe test-pretty --host-abi-corpus
```

The native corpus exercises the same exported wrapper as the browser. Focused
`test_vir_prettym_site.py`, `test_vir_prettym_presentation.py` and
`test_vir_prettym_initialization.py` use `--vir-site-acceptance` with an emitted
root/nested/downstream site plus native-corpus.json. They check raw segments/tags,
existing HTML/classes/bindings, relative resource URLs and basic initialization.
Exact executed source and evidence are identified in the [review notes](vir-review-stack.md).
