# Minimal PrettyM landing

Branch: `feat/vir-prettym-434-minimal`.
Base: `a51f7e581893042eb317edf50216060a26f38ac3`, the module-system conversion.

## Three commits

1. `51c6d359`: bounded Lean formatter, exact dependencies, library-owned pack
   preparation/carrier, validated publication and internal lifecycle bootstrap.
   The base presentation remains until commit two; this is an intermediate
   migration step, not a supported second backend.
2. `19c62e86`: switch panels/lightboxes to mandatory VIR, removing handwritten
   JavaScript layout while retaining shared measurement and DOM presentation.
3. `18707d90`: retained formatter/publication tests, adapted
   namespace checks, browser coverage, downstream example and concise notes.

## Scope reduction

The existing `Config` and `slidesMain` APIs are preserved. Bootstrap bytes enter
an internal asset plan. No general asset API, filesystem-directory installer,
managed `:slides` facet, input/output receipts, CLI arguments or render-time
input-reporting protocol is introduced. Select an output destination through
existing `Config.outputDir`.

The larger reviewed branch `feat/vir-prettym-434-review` at `c17c584` and accepted
candidate at `3f7dbc93` remain unchanged. Deferred directory assets, managed builds
and CLI output support remain there for independent future PRs. Detailed
historical logs/correspondence remain there rather than enlarging this landing.

Lean formatting/bounds, the exported wrapper, typed adapter, complete independent
ABI reference, browser lifecycle/presentation, resource publisher and exact
runtime/program identities are byte-identical to `c17c584`. The source-only
VIR pin successor at `2461cfa` selects the public runtime lock. The renderer,
Lake setup, example and associated tests/docs are deliberately reduced. Earlier
execution evidence keeps its original source references and is not a fresh
qualification of the reduced renderer.

## Local feedback and remaining gates

Lean Beam synchronized the reduced renderer and adapted configuration checks
with zero blocking errors; a documentation warning was corrected. No Beam
checkpoints were saved. After stopping Beam, the targeted warm batch command
`lake build demo-slides test-config-validation test-vir-publication` passed
(751 jobs). This compiled test executables but did not execute them. No native,
Node or browser test campaign ran during that reduction. Subsequent public-source
qualification is recorded below; no fresh CI claim is made.
Intermediate commits are not independently qualified.

VIR supplies the public exact runtime source at `87d7646d`; Slides owns
[public-source qualification](vir-public-runtime.md) and remaining
geometry/retention/product acceptance. Historical `af3052c` supplied-pack
qualification stays separate. See [integration notes](vir-deck-build.md).
