# Building a VIR-backed deck

## Normal commands

```sh
lake exe demo-slides
lake exe demo-slides --output public/talk
lake build :slides
```

The first command builds the executable **and its selected VIR
artifact**, then renders `_slides/`. The second changes the
destination without reconfiguring Lake. The third builds a managed
site at `.lake/build/slides/demo-slides/index.html` (respecting a
custom `buildDir`). It skips unchanged sites and repairs missing,
damaged or stale generated assets.

Serve either output over HTTP, for example:

```sh
python3 -m http.server -d public
```

Visit `/talk/`. All browser assets are local; no CDN is required.

### SDK availability on this review branch

This branch uses Lean 4.34.0-rc2 and frozen VIR producer
`6e68a9e7599ffb82ab198566715d345eb6c6c9ed`. It is not a public release
promise. For local review, make that exact Git dependency available
and supply the already-built matching SDK:

```sh
export VIR_SDK_ARCHIVE=/absolute/path/to/lean-vir-sdk.tar.gz
```

Its SHA-256 is
`75ae0554f0175d9a3dd4f12107b5883d364a72994e24da18192bc5ef55d9db1b`.
Lake invokes VIR's existing SDK acquisition/verification; it never
builds the SDK with WASI. Missing or mismatched inputs remain explicit
errors. The external acceptance harness uses command-local Git URL
mappings to independent local clones; a public SDK/dependency
publication is separate from this build API.

## The downstream author API

[examples/vir-deck](../examples/vir-deck) is a complete small project.
Replace its in-tree Slides path dependency with an exact Git
dependency when moving it to a separate repository. Its Lakefile needs
only the usual library/executable declarations and one linked
artifact:

```lean
lean_lib MyTalk

lean_lib «talk-runtime» where
  roots := #[`MyTalk.Runtime]

@[default_target] lean_exe «my-talk» where
  root := `Main
  moreLinkObjs := #[`@/«talk-runtime»:slidesRuntime]
```

`Main.lean` imports the VIR-aware entry point and forwards ordinary
arguments:

```lean
import VersoSlides.VirMain
import MyTalk.Slides

open VersoSlides

public def main (args : List String) : IO UInt32 :=
  virSlidesMain (doc := %doc MyTalk.Slides) (args := args)
```

Then `lake exe my-talk` works normally. There is no per-deck facet
type declaration, job composition, process-launch code, handwritten
JSON configuration or manifest argument. Plain `slidesMain` remains
available for non-VIR decks.

For formatting only, select a one-root library rooted at
`VersoSlides.VirPrettyM`. For a combined application, follow
`MyTalk.Runtime`: import `VersoSlides.Pretty`,
`meta import Vir.Attributes`, and explicitly export `formatSegments`
plus the deck's own functions. The root's formatter has the signature
`Std.Format → Nat → Nat → Array VersoSlides.Pretty.Segment`. The
bootstrap checks the export and arity before startup; full
argument/result decoding remains VIR's responsibility.

## What Lake owns

The `slidesRuntime` library facet is registered by the Slides
dependency's Lakefile. This matters on a clean checkout: Lake can
resolve registered facets without first importing an unbuilt helper
module into the consumer's Lakefile.

The facet fetches VIR's actual `virWebAssets : FilePath` result and
generates a tiny host-native object containing that path.
`moreLinkObjs` makes it a normal executable link dependency. It is
**not** another runtime or a compiled copy of the browser payload.
`virSlidesMain` reads the linked path; no environment lookup, runtime
invocation of Lake, or reconstruction of dependency `.lake` paths
occurs. The producer path is part of the build trace, so a new
checkout binds its own location. The build executable is
workspace-bound; the emitted site is relocatable.

The package `:slides` facet builds each default executable into its
own managed directory under `<buildDir>/slides/<executable>/`. It
records the executable/job trace, output contents and render-time
input contents (copied image files and `extraAssetDirs`). An unchanged
build does not rerun generation. Changing a render-time source,
deleting an output or damaging a copied asset triggers regeneration.
Receipts and input lists are generated metadata beside the site, not
author-maintained configuration.

Custom final destinations use `lake exe my-talk --output destination`.
As with any `lake exe` command, the executable runs each time; managed
incremental output is the role of `lake build :slides`. No
`-R -KdeckOutput` setting is needed.

## What the application and browser own

The application selects exactly one composite root. Imported
contributions need explicit wrappers; independent programs/heaps are
not automatically merged. `slidesMain` installs the producer-returned
directory into the final site's owned `vir/` directory, replacing
stale contents while preserving unrelated files.

The singleton bootstrap uses relative URLs and the SDK's
`irPackageSet` loader, creates one runtime and runs startup. It
retains that runtime on persisted page transitions and disposes it on
permanent exit. Panels wait for initialization. Deck code can use the
runtime returned by `window.versoVirReady` for other exports. Current
Nat results and segment tags cross the ABI as decimal strings.

JavaScript still owns DOM measurement, compact input adaptation and
tagged segment-to-HTML rendering. Lean/VIR performs
`Std.Format.prettyM` layout. This is not an all-Lean DOM renderer.

## Focused acceptance

```sh
python3 scripts/test-external-vir-deck.py --sdk-archive "$VIR_SDK_ARCHIVE"
uv run --project browser-tests pytest browser-tests/test_external_vir_deck.py \
  --site-dir /absolute/path/from/result/siteRoot --browser=all
```

The harness retains an independent Git consumer, logs and
`result.json` under `_test`. It tests ordinary executable invocation,
custom build/output paths, managed warm builds and repairs,
render-time source changes, SDK errors and recovery. Matching
compilation caches are copied to bound cost: this is not an
empty-cache or cache-only compiled-input claim.

The browser tests execute real Wasm and both contributions, cover
styling, reload, early errors and deterministic persisted transitions,
and exercise actual history navigation. Browser-selected cache
eligibility is not guaranteed. No production lifecycle counters or
external browser services are required.
