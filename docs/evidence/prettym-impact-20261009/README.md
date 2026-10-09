# PrettyM PR: artifact and build comparison

Control: refactor PR83, `23daa2e3eb45c5838bd7860cc21d06d5089515d7`.
Candidate: stacked formatter, `b232e7393bb21c8d98e78c078f1f16b2077c0092`.
Both use Lean 4.35.0-rc4 / compiler c29b6dda. Non-VIR dependency pins are
identical; the candidate adds the exact qualified public VIR3e/6cdd/00c4 pair.
No tag adoption or application edit is included.

## Protocol

Two detached private worktrees, with independent copies of the exact already-built
dependencies from the accepted Slides integration. Runtime acquisition was already
cached. Setup built each version once outside the headline samples, ensuring all
dependency and configuration outputs were warm at their new locations.

Public command `lake --no-cache build` measured through the normal native demo
executable. Four project-clean samples ran old/new/new/old; each root .lake/build
was moved aside before its run, without deleting shared caches. Dependency library outputs
were retained; the ordinary Demo external-code highlighting step rebuilds in the
application-clean samples and remains included in the public command timing. Sixteen no-change samples used old/new/new/old repeated four times,
without invalidation. Serial runs, same host and source, no diagnostics/instrumentation
inside Lean. GNU time records wall/user/system/peak RSS; a monotonic clock records
the command boundary. Binary hashes are stable across all runs of each version.

This is application-clean with dependencies warm, not first installation,
all-dependency clean, anonymous acquisition, OS-cold, or CI performance. Linux
7.2.6, AMD Ryzen AI 9 HX 370, 24 logical CPUs. OS caches and CPU boost not fixed;
other host work not isolated. Two clean samples are a local snapshot, not a
statistical performance guarantee.

## Results

| Command scope | Old median (range) | New median (range) |
| --- | ---: | ---: |
| Fresh app build; 2 samples each | 26.776 s (26.769–26.783) | 31.377 s (30.215–32.538) |
| Warm no-change; 8 samples each | 0.730 s (0.712–0.743) | 1.079 s (1.038–1.096) |

Project-clean paired deltas: +3.446 s and +5.756 s. This reports added build cost;
no optimization or browser execution-time claim.

After timing, `lake --no-cache exe demo-slides` produced each ordinary site.
Files/bytes are retained in old-files.json/new-files.json. Output is not reused
between variants. The candidate's regenerated program has the accepted full
SHA256 ba9165b0d91edb0fb3e66276daf0cde8cefc255d67f4508bcd19e72fb0e5a46a;
published manifest payload lengths/hashes also validate. No new native/browser
test campaign was run. Gzip counts are deterministic level-9 per-file estimates,
not browser request counts or measured wire bytes.

| Artifact | Old bytes | New bytes |
| --- | ---: | ---: |
| Complete published demo | 3,680,917 | 4,863,875 |
| Complete demo, gzip sum | 1,867,581 | 2,137,196 |
| pretty.js | 24,812 | 12,533 |
| Additional VIR files | 0 | 1,192,171 |
| Additional VIR files, gzip sum | 0 | 271,191 |
| Native demo executable | 129,025,696 | 130,732,536 |

identity.json records source/cache policy and planned order; samples.json contains
all actual samples (including excluded setup); summary.json contains aggregation;
measure.py is the executed adapter; raw command/time/render logs are alongside.
Private generated builds are retained under retained-builds. Accepted review trees,
source/cache/evidence and producer worktrees remain untouched. Refresh affected
figures if the eventual VIR tag changes production inputs.

## Added-resource breakdown

| Added component | Raw | Gzip estimate |
| --- | ---: | ---: |
| Wasm runtime | 753.4 KiB | 174.6 KiB |
| JavaScript loader and runtime glue | 233.7 KiB | 45.8 KiB |
| Formatter IR and embedded ABI metadata | 73.3 KiB | 12.3 KiB |
| Bundle manifests and package-set index | 4.0 KiB | 1.9 KiB |
| License and notice files | 99.7 KiB | 30.3 KiB |
| **Total** | **1164.2 KiB** | **264.8 KiB** |

Shared runtime including its bundle descriptor: 1,114,198 raw / 257,308 gzip bytes.
PrettyM program including bundle descriptor and package-set index: 77,973 raw /
13,883 gzip bytes. Their sum matches the complete published lib/vir inventory.
ABI interface manifests live inside the seven IR packages: 6,573 bytes including
section framing; no additional ABI JSON file is published. Compression within
an IR package is not additive by section, so subsection gzip attribution is omitted.

The JavaScript component includes the browser loader, host ABI marshaling and
VIR WebAssembly instantiation glue. The Wasm component includes the shared interpreter and
Lean runtime. Its size is not further attributed to C++ source modules here.

IR package attribution from the generated package-set index:

| Module | Raw package | Gzip package |
| --- | ---: | ---: |
| Init.Prelude | 0.66 KiB | 0.41 KiB |
| Init.Control.Id | 1.94 KiB | 0.57 KiB |
| Init.Data.Int.Basic | 0.89 KiB | 0.49 KiB |
| Init.Control.State | 5.80 KiB | 1.24 KiB |
| Init.Data.Format.Basic | 11.05 KiB | 2.25 KiB |
| VersoSlides.Pretty | 47.57 KiB | 5.99 KiB |
| VersoSlides.VirPrettyM | 5.39 KiB | 1.35 KiB |

Source inspection at the selected exact3e source and matching emitted runtime.js:
createProgram calls fetchPayloads for both complete bundle inventories; the worker
fetches and hashes every descriptor.files entry, including LICENSE/NOTICE/
lean-LICENSE/lean-LICENSES. Their cost is currently part of initialization, not
just a disk-size accounting entry. This is an observed contract/cost, not a
publisher change or a proposal to remove notices.

component-breakdown.json retains exact component totals and file identities;
ir-sections.json was read with VIR's own readIrPackageInfo parser. No new build,
benchmark or semantic test was run for this read-only refinement.

## JavaScript attribution and notice packaging

The exact published runtime.js has39 esbuild source-module blocks. Their byte
counts sum exactly to239305; attribution includes module comments and final
export boilerplate. These are emitted raw-byte groups, not estimates from source
line counts. No Emscripten-generated JavaScript module is bundled here.

| JavaScript component | Raw |
| --- | ---: |
| Interface and IR-package validation | 40.5 KiB |
| Typed value conversion and encoding | 90.3 KiB |
| Runtime factory, calls and lifetime | 36.2 KiB |
| JS/DOM/infoview host bindings | 43.0 KiB |
| Resource loading, integrity and export selection | 23.7 KiB |

The factory eagerly includes the generic browser host-binding modules. JS/DOM/
infoview support contributes43.0KiB even though the Slides formatter's exported
entry is pure. This is a producer-owned bundling opportunity, not a proposal for
an application-private loader or a second formatter backend. Typed-value handling
is the largest group; Std.Format and Array Segment still require generic
constructor/structure/array/Nat/string conversion.

The published packing script uses bundle:true but does not enable minify.
An offline esbuild transform of the exact emitted file (esbuild version retained
in js-minification-estimate.json) gives:

| Variant | Raw | Gzip estimate |
| --- | ---: | ---: |
| published | 233.7 KiB | 45.8 KiB |
| minified | 124.3 KiB | 33.1 KiB |
| minified-keep-names | 137.5 KiB | 36.2 KiB |

This is a size-only estimate. No runtime pack was regenerated, selected or
behaviorally qualified. A production minification change requires the owning
VIR release/qualification sequence and new runtime content identity.

Licensing: Apache2 section4 covers source and object/binary redistribution and
requires recipients get a license copy and applicable NOTICE attribution.
https://www.apache.org/licenses/LICENSE-2.0.html
Apache's distribution guidance describes one collective license copy plus
applicable third-party notices:
https://apache.org/legal/apply-license.html
Both LICENSE and lean-LICENSE carry Apache2 terms; they differ in formatting,
appendix inclusion and one punctuation mark, not declared license version.
Consolidation must retain proper attribution and complete applicable terms.

lean-LICENSES describes the complete Lean binary distribution: LLVM and legacy
LLVM, GNU C Library, GNU MP, CaDiCaL, leantar/lean4lean/nanoda/con-leche/con-ron.
This is not a binary-specific VIR Wasm notice inventory. The exact linked
components must be audited before omitting any section; this analysis did not
prove which are absent from the selected Wasm. It did not grant removal approval.

Required notices can remain distributed without being startup payloads: the
license does not require that the browser fetch them before executing formatting.
The current producer-created inventory and generic fetchPayloads loop do include
them at startup. Decoupling documentation from executable payload verification,
deduplicating common license text, and auditing binary-specific notices are
upstream design follow-ups. No source/publisher/loader/license file was changed.
