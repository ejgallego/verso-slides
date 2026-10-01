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
pack and acquires the exact prebuilt runtime. The carrier's source-relative
`.vir-generated` include is VIR's current build interface. Compiled Lean values
own the bytes; the renderer reads no producer paths and invokes no build tools.
The small `vir-resources/VersoSlidesVirPrettyMResources.json` recipe selects the
program module and public export role. It is configuration, not an ABI snapshot.

Slides publishes the runtime and program under `lib/vir/<contentId>/` through
its existing asset writer. A single validated plan supplies files and relative
loader URLs. Configured assets cannot overwrite that namespace. Publication
writes in place, retains stale files and may leave partial output on failure;
rerun after correcting the destination or use a fresh output directory.

## Formatter and lifetime

The `formatSegments` role calls `VersoSlides.VirPrettyM.formatSegments`:

```text
Std.Format → Nat → Nat → Except FormatError (Array Pretty.Segment)
```

VIR marshals using generated Lean metadata. JavaScript checks the compact input
before recursive conversion; Lean checks it before layout and reserves output
before allocation. Limits are 10,000 nodes, depth 128, 64 KiB aggregate input,
16 KiB per text node, 4,096 hard newlines/columns/absolute indentation,
1 MiB output text, 10,000 segments and 65,536 output tag entries.

One program is initialized per document. Loading/failure leaves static slides
usable. Expected format errors preserve the instance; unexpected failures close
formatting. There is no retry or replacement. Terminal pagehide cancels pending
creation or disposes the program; persisted pagehide preserves it.

## Tests

Native tests are in `Tests/Pretty.lean` and `Tests/VirPublication.lean`. Node
checks cover admission, presentation and document lifetime:

```sh
node --test Tests/pretty-input.test.cjs Tests/pretty-presentation.test.cjs Tests/vir-bootstrap.test.cjs
```

Focused Playwright tests are `browser-tests/test_vir_prettym_*.py`.
They compare full segments/tags against the native corpus and exercise DOM
bindings, escaping, lifecycle, geometry and reflow. Native corpus output is
available from `lake exe test-pretty --host-abi-corpus`, `--bounds-corpus` and
`--geometry-corpus`; see the tests' fixture requirements.

The [review notes](vir-review-stack.md) identify the executed source and retained
results. The mobile panel restoration defect remains deferred to a separate
patch after this landing; current geometry evidence does not close that gate.
