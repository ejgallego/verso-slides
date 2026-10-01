# Lean formatting through VIR

Lean owns formatting behavior. VIR executes the formatter. JavaScript owns DOM
measurement, annotations, presentation and interaction. Production has one
formatting path; there is no JavaScript layout implementation or fallback.

## Build and use

```sh
lake build
lake exe demo-slides
python3 -m http.server --directory _slides
```

A downstream presentation calls the existing `slidesMain (config := ...) (doc := ...)`.
Set the existing `Config.outputDir` field to choose an output directory.
The example in `examples/default-deck` requires no application resource setup.

Lake prepares `VersoSlidesVirPrettyMResources:virResourcePack` before compiling
its `include_vir_bundle` carrier. The independent formatter library prevents a
program/carrier dependency cycle. The native renderer uses embedded bundle
values and does not discover a producer path or invoke a nested build.

The renderer prepares one validated publication plan, publishes complete runtime
and program bundles under `lib/vir/<contentId>/`, and emits a small internal
inline bootstrap with site-relative URLs. The single program URL and resource
bytes enter the existing asset plan; there is no generated bootstrap asset or
separate directory installer. Configured assets cannot replace the reserved
`lib/vir` namespace or its `lib` parent, including casing and separator aliases.
The ordinary asset API and `slidesMain` signature are unchanged.

Publication uses the existing writer and requires one writer. Files are written
in place; unrelated and stale files are retained. A write failure can leave
partial site output. Correct the destination and rerun, or publish into a fresh
output directory when old files must be absent. This is not transactional site
deployment. Resource validation and configured namespace checks precede writes.

## Formatter contract

Role: `formatSegments`; declaration: `VersoSlides.VirPrettyM.formatSegments`;
interface: `verso-slides-format-segments-hostabi-v2`.

```text
Std.Format → Nat → Nat → Except FormatError (Array Pretty.Segment)
```

The independent complete ABI reference is embedded at build time. The runtime
checks it during creation. JavaScript admits the compact input iteratively before
ABI conversion; Lean independently checks input and reserves output before
allocation. Recoverable rejection leaves the program usable, with no truncation.

| Bound | Limit |
| --- | --- |
| Input nodes / depth | 10,000 / 128 |
| Aggregate input text / individual text | 64 KiB / 16 KiB |
| Hard newlines | 4,096 |
| Width / absolute cumulative indentation | 4,096 columns |
| Output text / segments / aggregate tag entries | 1 MiB / 10,000 / 65,536 |

Tags use bounded exact decimal values. Newline segments preserve active tags.
Pixels are converted to columns using DOM measurement; complete tag associations,
CSS classes, bindings, escaping and reflow share one presentation layer.

Static presentation/navigation remains usable during loading or failure. Retry
owns a fresh creation attempt. Pending cancellation, stale completion checks,
resolved disposal and raw cleanup diagnostics stay explicit. Persisted pagehide
preserves the instance. Cancellation does not preempt synchronous Lean execution.

## Exact artifacts and qualification

VIR pin: `590be72bd91519c7beb89e105dfba498a4aff140`, Lean 4.34.0.
Runtime content ID: `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d`.
Runtime pack SHA-256: `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1`.
Program content ID: `97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58`.

The runtime lock names the public [exact release pack](https://github.com/ejgallego/lean-vir/releases/download/resource-832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d/832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d.virres).
Ordinary resource preparation remains library-owned and verifies content identity;
there is no implicit Wasm source build or formatter fallback. The historical
supplied-pack checkpoint stays separate from [public-source qualification](vir-public-runtime.md).
The [focused browser checkpoint](vir-browser-acceptance.md) passes semantic,
font, geometry and bounded retention checks. Overall product acceptance remains
open, including the separately reproduced mobile panel restoration issue.

[Accepted historical execution and immutable logs](https://github.com/ejgallego/verso-slides/blob/3f7dbc93f10f1ed2ef88ee65dda9019b5c298233/docs/evidence/publication-adoption/README.md)
remain on the development branch. This reduced renderer is a new source checkpoint;
those executions are not a fresh campaign against it. See
[the review guide](vir-review-stack.md) for scope and local compilation feedback.

The historical [namespace and ordinary downstream qualification](evidence/landing-qualification/README.md)
passes 54 focused cases and fresh default/explicitly enabled cache builds. Runtime
and program identities are unchanged; no additional browser or CI run is claimed.

The [asset simplification checkpoint](evidence/asset-simplification/README.md)
records fresh checks of the current inline publication path and VIR successor.
Historical executions above retain their original pins and production source.

Managed incremental site builds, render-time input receipts, generic directory
assets and output command-line options are deferred to separate patches.
