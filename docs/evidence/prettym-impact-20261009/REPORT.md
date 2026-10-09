# PrettyM consumer footprint: findings for the VIR roadmap

## Requested disposition

**Register this information in the VIR roadmap for future consideration only.**
Emilio requested consolidation and delivery to the existing integration agent.
This is not an implementation assignment, API-change request, new qualification
campaign, runtime-release request or consumer adoption handoff. It should not
block the current tag or first Slides formatter landing. VIR keeps core/runtime/
packaging ownership; Slides retains application and downstream acceptance.

## Exact measured snapshot

- Old: JavaScript formatter on the standalone shared-rendering refactor PR83,
  Slides `23daa2e3eb45c5838bd7860cc21d06d5089515d7`.
- New: three-commit formatter stack,
  Slides `b232e7393bb21c8d98e78c078f1f16b2077c0092`.
- Common upstream Slides base `682186a561a5d55116969f39bb0699986c3c7fba`;
  Lean `leanprover/lean4:v4.35.0-rc4`, compiler
  `c29b6dda4f7c20e3eeaa717c4e565663c5cfa364`.
- Inspected VIR source `3e7dbcf0615305c83bdcb9aa1892ac8b22087d8e`.
  These findings describe the selected historical pack, not necessarily latest
  VIR. Reconcile against current/tagged source before future work.
- Runtime CID `6cddc4b897410d7524a69bdaff0327d9f07916735078a0b12d548e2f88c23d20`;
  pack SHA256 `8fbf3dd2cc065c714ba17b7093edbcd1e285e7fc6353b7b7594c5031781dccf3`;
  1,114,116 bytes. runtime.js SHA256
  `b216a5964e9cdc4115877eaa71a27fa32108a40c805ff87f0f29bb51700cf039`;
  runtime.wasm SHA256
  `4a2da5b488dfd6db62918079147b8d7bda3c3654ed43d76f65d80de0f67596d2`.
- Program CID `00c4cc5794f68178e57d5e37d7b36889abf708abc0ac300337068930db4dd48b`;
  pack SHA256 `ba9165b0d91edb0fb3e66276daf0cde8cefc255d67f4508bcd19e72fb0e5a46a`;
  77,891 bytes. Its typed interface remains
  `Std.Format → Nat → Nat → Array Pretty.Segment`, called as
  `VersoSlides.VirPrettyM.formatSegments`.

## Before/after artifact sizes

Same ordinary demo, freshly rendered into separate output directories. Sizes
include the complete published site, not just resources fetched by a particular
page view. Gzip means a sum of per-file level-9 compression, not measured wire
traffic. KiB/MiB use powers of 1024.

| Artifact | Old JS | New Lean/VIR |
| --- | ---: | ---: |
| Published site, raw bytes | 3,680,917 | 4,863,875 |
| Published site, gzip bytes | 1,867,581 | 2,137,196 |
| pretty.js, raw bytes | 24,812 | 12,533 |
| pretty.js, gzip bytes | 6,210 | 3,553 |
| Native demo executable, bytes | 129,025,696 | 130,732,536 |
| Published file count | 97 | 113 |

The published demo grows from3.51 to4.64MiB raw, or1.78 to2.04MiB estimated gzip.
The native executable grows from123.05 to124.68MiB. Browser pretty.js shrinks
from24.2 to12.2KiB raw. Added VIR files total1,192,171 raw /271,191 gzip bytes.

## Added VIR resource components

| Component | Raw KiB | Gzip KiB |
| --- | ---: | ---: |
| Wasm runtime | 753.4 | 174.6 |
| JavaScript loader and runtime glue | 233.7 | 45.8 |
| Formatter IR and embedded ABI metadata | 73.3 | 12.3 |
| Bundle manifests and package-set index | 4.0 | 1.9 |
| License and notice files | 99.7 | 30.3 |

Total:1,164.2KiB raw /264.8KiB gzip. The complete PrettyM program including its
bundle descriptor/package-set index is76.1KiB raw /13.6KiB gzip. The shared
runtime including accompanying notices/descriptor is1,114,198 raw /257,308 gzip
bytes. Raw `.virres` transport pack lengths differ slightly from published
file sums because container/envelope framing differs.

The seven IR packages contain67,675 bytes of declaration sections,6,573 bytes
of embedded interface-manifest sections (including framing), and806 bytes of
other sections/header/directory framing. No standalone ABI JSON payload is
published. The per-module and per-section attribution is retained in
ir-sections.json; the package-set index identifies Init.Prelude,
Init.Control.Id, Init.Data.Int.Basic, Init.Control.State, Init.Data.Format.Basic,
VersoSlides.Pretty and root VersoSlides.VirPrettyM. Section gzip contributions
cannot be added because the whole file shares a compression dictionary.

Emilio's assessment: the Wasm footprint is reasonable for the offered
functionality; IR improvements are expected later. These are roadmap observations,
not additional optimization tasks or a new ABI/format migration request.

## Build-time comparison

Public command `lake --no-cache build` through normal native demo completion.
Private old/new worktrees used copies of exact already-built dependencies.
VIR's runtime was already cached. Setup ran once per variant outside measurement.
Application `.lake/build` was moved aside before each fresh application sample;
dependency library outputs were kept. Normal demo extraction/highlighting stayed
inside the timed command. Builds were serial; order old/new/new/old. Warm samples
repeated that order four times without invalidation.

| Scope | Old median (range) | New median (range) | Samples/version |
| --- | ---: | ---: | ---: |
| Fresh app build, dependencies warm | 26.776s (26.769–26.783) | 31.377s (30.215–32.538) | 2 |
| Warm no-change build | 0.730s (0.712–0.743) | 1.079s (1.038–1.096) | 8 |

Fresh-build paired deltas:+3.446s and+5.756s. This is a local build-cost snapshot,
not first installation, all-dependency clean, download time or CI performance.
Host: Ryzen AI9HX370,24 logical CPUs, Linux7.2.6. OS cache/boost/background work
not isolated; two clean samples do not establish a statistical guarantee.
GNU time wall/user/system/peak RSS and monotonic elapsed records are retained.
Binary hashes were stable across all samples of each variant. Site generation
and output validation happened outside build timing. No browser startup or
per-format invocation latency was measured in this campaign.

## JavaScript responsibilities

39 esbuild emitted source-module blocks sum exactly to239,305 bytes. Source block
attribution includes comments and export boilerplate. The file contains VIR's own
modules; the previous Emscripten-generated-loader description was incorrect.

| Responsibility | Emitted raw KiB |
| --- | ---: |
| Interface and IR-package validation | 40.5 |
| Typed value conversion and encoding | 90.3 |
| Runtime factory, calls and lifetime | 36.2 |
| JS/DOM/infoview host bindings | 43.0 |
| Resource loading, integrity and export selection | 23.7 |

The resource loader itself is23.7KiB. Much of the233.7KiB bundle is the general
host ABI and runtime API, rather than file acquisition. No per-block compressed
saving is inferred from raw attribution.

## Roadmap candidates, in recommended order

### A. Release JavaScript minification

The current packer bundles but does not enable minify. Offline esbuild0.27.7
transforms of the exact emitted file give:

| Variant | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| published | 239,305 | 46,896 |
| minified | 127,333 | 33,861 |
| minified-keep-names | 140,760 | 37,117 |

Keeping names saves98,545 raw /9,779 gzip bytes while retaining diagnostic names.
These are size-only estimates; no minified runtime has been behaviorally
qualified, packed or adopted. Any production change needs a new runtime CID,
producer qualification and explicitly sequenced consumer adoption.

### B. Notice delivery and binary-specific packaging

The loader fetches/hashes every listed runtime/program file, including all
license notices. Notices account for99.7KiB raw /30.3KiB gzip at initialization.
Required notices can remain distributed while being separated from executable
startup fetches. This needs producer-owned inventory/loader design, not manual
asset deletion by Slides.

Apache2 section4 applies to source and object/binary redistribution and requires
a license copy plus applicable NOTICE attribution. Common license text may be
consolidated with attribution preserved. LICENSE and lean-LICENSE both carry
Apache2 terms, with formatting/appendix/punctuation differences. lean-LICENSES
covers Lean's complete binary distribution (LLVM, legacy LLVM, GNU C Library,
GNU MP, CaDiCaL, leantar/lean4lean/nanoda/con-leche/con-ron), not a binary-specific
VIR Wasm inventory. Audit actual linked inputs before omitting any notice section.
We have not established which are absent; this is not removal approval.

Primary references: [Apache License §4](https://www.apache.org/licenses/LICENSE-2.0.html),
[Apache distribution guidance](https://apache.org/legal/apply-license.html).

### C. Optional host-provider packaging

The43,987-byte host-integration group includes required shared host-state code;
it is not all proved removable. Browser/timer/animation/infoview provider modules
and their aggregate factory account for22,474 bytes. createBrowserHostBindings
spreads all provider maps; web/src/vir-runtime.js selects it as the default,
and factory-core instantiateModule invokes it. The admitted formatter is pure
with no hostImports. Consider separating core invocation from optional services
while preserving bridges, lifecycle and behavior for programs using those imports.
No application-private loader, fallback formatter or extra Slides configuration.

### D. Optional kernel-syntax codec packaging

object-values.js contributes44,208 emitted bytes;13 Lean.Expr/Level/literal
lowering/lifting methods contribute17,501 bytes, before support helpers. The
formatter's complete admitted graph uses Nat, Int, Bool, String, SimpleEnum,
Array, Structure, CustomInductive, RecursiveSelf; no Expr, Function or opaque
Resource crosses this ABI. Internal Lean closures are not host callbacks.
The general dispatcher retains all methods; a separable syntax capability might
avoid these in programs that do not need them. Keep generic recursive
constructor/structure/array/scalar handling required by Std.Format/Array Segment.
17.1KiB is raw attribution, not a proved compressed saving.

### E. Constructor-helper simplification

makeObjectExprBinary and makeObjectLevelBinary repeat child lowering, a native
constructor call, zero-result handling, ownership transfer and finally release.
Binding/let/projection paths have related scaffolding. A consuming-constructor
helper could improve maintainability. No large gzip win is claimed. Preserve
partial-construction cleanup, transfer-on-success, traps and primary diagnostics.

### F. Reuse validated resource snapshots where sound

Resource fetching checks lengths/hashes; fetchIrPackageSet checks them again.
The resource adapter reads/validates IR manifests for compatibility/expected
exports; the factory snapshots and validates members again. Investigate reusable
private admitted snapshots. This is not a measured hotspot or request to delete
validation. Raw/deferred mutable input, JS admission, native admission and
publication are different boundaries and remain protected.

## Credit existing work / avoid false follow-ups

- Layout plans are already cached in objectLayoutPlan's WeakMap.
- The admitted runtime manifest tree is already frozen.
- Factory installation already bypasses another public raw-byte JS validation
  after its owned snapshot has been checked.
- Tiny facade/re-export files are not material size drivers.
- Ownership/finally/retired-object guards are correctness code, not removable
  merely because verbose. Do not replace them with a superficially shorter path.

## Evidence and action boundary

Detailed source findings: JS-FINDINGS.md. Numeric identities and attribution:
identity.json, samples.json, summary.json, old-files.json, new-files.json,
component-breakdown.json, js-module-blocks.json, js-breakdown.json,
object-values-methods.json, formatter-interface-use.json, ir-sections.json,
js-minification-estimate.json. Raw logs and executed measure.py are retained.
ledger.json hashes every retained file. Generated cache trees and minified
experimental source outputs are not part of the public record.

Earlier exact-pair Slides qualification is retained separately in
[main435 adoption](../main435-adoption/README.md): native/Node/publication/fixtures/
TypeScript and30 focused Chromium/Firefox checks. The stacked production/test
bytes equal that qualified tree except short review notes. This audit adds no
new semantic/browser acceptance or new runtime selection. It does not qualify
future changed blobs, mobile/geometry/retention, offline installation or latest
VIR. No producer/source/loader/license mutation was performed.

**For now: add the evidence links and candidate follow-ups to the roadmap only.**
No implementation, API agreement, pack regeneration, tag delay, consumer repin,
repeat test campaign, new issue/PR, merge, release or cleanup is requested.
