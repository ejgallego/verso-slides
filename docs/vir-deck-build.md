# Lean formatting through VIR

Lean's `Std.Format.prettyM` owns layout. VIR executes it; JavaScript measures
available width and presents the resulting text and annotations. There is one
production formatting path.

## Build and use

```sh
lake build
lake exe demo-slides
python3 -m http.server --directory _slides
```

Downstream decks keep `slidesMain` and `Config.outputDir`; no resource setup is
needed in the application. See `examples/default-deck`.

The formatter and resource carrier are separate Lake libraries to avoid a build
cycle. VIR's `virResourcePack` prerequisite compiles the program, prepares its
pack and acquires the exact prebuilt runtime. The carrier names its owning
library with
`include_vir_library VersoSlidesVirPrettyMResources`; VIR owns the generated
artifact location. The root module `VersoSlidesVirPrettyMResources.lean` is the
carrier; no separate Lean resources directory or wrapper module is needed.
`.vir-generated/` is ignored because VIR stages generated embedding input in
the owning library source root. Application code does not reference that path.
Compiled Lean values
own the bytes; the renderer reads no producer paths and invokes no build tools.
The small `vir-resources/VersoSlidesVirPrettyMResources.json` recipe selects the
program module and public export role. It is configuration, not an ABI snapshot.

VIR’s `ResourceSet.forSite "lib/vir"` prepares all resource files and loader
paths. Slides supplies its single formatter and publishes the returned files through
its existing asset writer; it constructs no manifests or content-ID paths. The
writer rejects exact filename collisions before writing. Additional namespace
and casing policy is deferred with general asset validation. Publication
writes in place, retains stale files and may leave partial output on failure;
rerun after correcting the destination or use a fresh output directory.

## Formatter and lifetime

The `formatSegments` role calls `VersoSlides.VirPrettyM.formatSegments`:

```text
Std.Format → Nat → Nat → Array Pretty.Segment
```

VIR marshals using generated Lean metadata. The adapter converts Verso's
compact representation and checks constructor shape. Numeric fields pass through
unchanged: VIR validates and marshals numbers, BigInts and decimal strings.
The Lean wrapper
runs `Std.Format.prettyM` directly, preserving the former trusted-input model.
VIR also converts the returned Lean array and segment records into JavaScript
arrays and objects; the application does not decode a result envelope.
Explicit resource budgets and their exclusive tests are deferred to a
[separate later PR](vir-followups.md).

`web-lib/panel/pretty-init.js` reads the three library-owned URLs from its
script element attributes. It owns application status and document cleanup;
acquisition, validation and execution remain in VIR.

One program is initialized per document. Loading/failure leaves static slides
usable. A rejected request preserves an active instance and its raw diagnostics; a
failed/disposed instance closes formatting. There is no retry or replacement.
Terminal pagehide cancels pending
creation or disposes the program; persisted pagehide preserves it.

## Tests

Native tests are in `Tests/Pretty.lean` and `Tests/VirPublication.lean`. Node
checks cover admission, presentation and document lifetime:

```sh
node --test Tests/pretty-presentation.test.cjs Tests/vir-bootstrap.test.cjs
```

Focused Playwright tests are `browser-tests/test_vir_prettym_*.py`.
They compare full segments/tags against the native corpus and exercise DOM
bindings, escaping, lifecycle, geometry and reflow. Native corpus output is
available from `lake exe test-pretty --host-abi-corpus` and
`--geometry-corpus`; see the tests' fixture requirements.

The [review notes](vir-review-stack.md) identify the executed source and retained
results. The mobile panel restoration defect remains deferred to a separate
patch after this landing; current geometry evidence does not close that gate.
