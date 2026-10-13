# Qualified public Lean 4.35.0 source/runtime/SDK pair

Outcome: the selected standard stable release is public and qualified. Source tag **4.35** points directly to actual landed **`225218e18a3ae554acc571a93aab484453d857a6`**. [Release4.35](https://github.com/ejgallego/lean-vir/releases/tag/4.35) is non-draft, non-prerelease and GitHub's current latest release, as selected. [Release workflow38367246318](https://github.com/ejgallego/lean-vir/actions/runs/38367246318) succeeded on that exact source, using the existing `release-sdk.yml` without modification.

Action for `vir/integration-coordinator`: hand this one exact public pair to the existing Slides owner for PR85 rebase/pin/regeneration and scoped downstream acceptance. Producer publication/qualification is complete. No consumer pin, renderer, benchmark or codec change was performed. Source/worktree/branches remain retained; cleanup was not selected.

## Immutable source and compatibility

- [Source225218e1](https://github.com/ejgallego/lean-vir/commit/225218e18a3ae554acc571a93aab484453d857a6): single parent `be01a69de96c49bde7863baf82e3cc4b7cc904fd`, tree **`09f8b1ceae98af24bcd88a70a248c2b186268f8b`**, exactly the qualified a3 tree from PR264. Pre-merge CI38330123797 passed all four jobs; the ready/guarded normal squash and actual parent/tree/main checks are retained in the separate landed receipt.
- Toolchain **`leanprover/lean4:v4.35.0`**, actual SDK compiler **Lean4.35.0 Release**, revision **`eb6cafb7290e8bd5f2937522d8d804f58f02bafc`**.
- Descriptor **2**, resource lock **1**, combined resource compatibility **6**, runtime ABI **4**, IR binary **11**, interface manifest **12**, package-set **2**, VIRRES framing **1**. SDK package version is independently **0.1.0**; release name4.35 follows Lean.
- Tag4.35 was absent locally/publicly before creation and pushed once at exact225218. No candidate tag, retag, force update, source redesign or local/Actions SDK upload was used. The standard workflow generated and published the actual landed-source archive. GitHub's release `targetCommitish` metadata says `main`; the independently resolved immutable tag, workflow head and SDK manifest all identify exact225218.

## Actual durable assets

| Asset | Bytes | SHA-256 | Asset ID |
| --- | ---: | --- | ---: |
| `lean-vir-sdk.tar.gz` | **1,286,987** | **`6c747aab1460f830733638d457a1bcd777a8e09cfa2e7cbcdb93b2a42a12a1e2`** | 636356712 |
| `c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60.virres` | **1,016,086** | **`caa48b273d3a01d7582444b9611c5070b2bcdd39330569ffdf6778f930a33687`** | 636356652 |

Actual durable SDK URL: [4.35/lean-vir-sdk.tar.gz](https://github.com/ejgallego/lean-vir/releases/download/4.35/lean-vir-sdk.tar.gz).

Runtime CID: **`c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60`**. The workflow's rebuilt runtime at [4.35/c9ec…virres](https://github.com/ejgallego/lean-vir/releases/download/4.35/c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60.virres) is byte-identical to the previously qualified non-latest content-addressed release. The source lock continues to select the original canonical [resource-c9ec… URL](https://github.com/ejgallego/lean-vir/releases/download/resource-c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60/c9ecb67aefdddf171f948591c170f36b293a6113fb97f6de1e893e9657daba60.virres), asset635160124. Its source tag/older asset were not relabeled, overwritten or repinned.

Both durable release assets were freshly downloaded with configuration/netrc-disabled anonymous curl, HTTPS-only redirects, no authorization headers; each returned HTTP200 after one redirect. Downloaded lengths/SHA match GitHub's actual asset metadata. Actual archives are retained under `release-assets/`; hashes remained unchanged after all smoke tests. Release/latest/tag readbacks are retained in the adjacent JSON/text records.

## SDK manifest and matched payloads

The actual downloaded manifest records `gitCommit=225218e18a3ae554acc571a93aab484453d857a6`, `gitDirty=false`, stable toolchain/compiler/eb6, version0.1.0, ABI4/binary11/manifest12, React and ReactDOM **19.2.7**, generated at `2026-10-13T08:12:29.303Z`. All **42** payload hashes were recomputed from the durable archive; all **40 JS** payloads match exact landed Git blobs and their source/path inventory. Both Wasm and all40 JS also match the previously qualified payload bytes, while this archive has its own landed-source/time identity. `SDK-IDENTITY.json` records every path, size, source and hash; `actual-installed-sdk-manifest.json` is from the ordinary default installation.

| Component | Bytes | SHA-256 / location |
| --- | ---: | --- |
| Bundled resource `runtime.js` | 119,478 | `07996fa1b5410f258206f5d8e1f1c3d3a3d896098c02f12688440290562d2d41`, inside the exact c9ec pack |
| Stripped release Wasm | 793,324 | `0b46452bf58183e41e9b9a53e26967ad3f72eba25bec86d99445b92ab9be9089`, SDK `wasm/vir-upstream.wasm` and resource `runtime.wasm` |
| Optimized unstripped dev Wasm | 4,080,563 | `8cf7739106557d64ecfbcd08ab64fff0254988a38102b8a159b70a407cedb26c`, SDK `wasm/vir-upstream.dev.wasm` |

Wasm profile remains `wasm32-wasip1`, release `-O3`, initial memory4,194,304/stack1,048,576; dev is its optimized unstripped companion. The existing SDK build uses WASI SDK33.0/clang+LLD22.1.0, LLVM4434dabb69916856b824f68a64b029c67175e532. The prior exact build/provenance/import-export inventories and new complete rebuilt pack equality bind the matching profiles. Resource `runtime.js` is the self-contained `createProgram` bundle; SDK `js/` is the separate direct-runtime module graph with preserved relative imports and declared React dependencies.

## Executed acquisition/runtime acceptance

1. Standard release workflow on exact225218: ABI and Lean-aligned tag admission, source/SDK install, actual release/dev SDK build, existing runtime units/extracted SDK smoke (including both-profile callbacks/disposal), runtime packing and durable publication all succeeded. The single owner/checker finished; no duplicate watcher remains. Full workflow log and final step results are retained.
2. Fresh ordinary **default** acquisition: a new client has Lean4.35.0 plus a Git requirement on exact public225218 and runs **`lake build :virSdk`**. All SDK archive/URL/tag/commit/repository/expected-commit source overrides and GH/GITHUB tokens were cleared. It cloned the actual source, built22 native jobs and downloaded the default `https://github.com/ejgallego/lean-vir/releases/download/4.35/lean-vir-sdk.tar.gz`; no local archive, preinstalled SDK, private loader, Wasm build, WASI SDK installation or source rewrite was supplied. The actual installed manifest and all42 payloads match the fresh standalone download.
3. Ordinary warm repeat with the same cleared environment passed. Every installed file's digest, inode, mtime and size stayed unchanged. Lake reported `Replayed ...:virSdk`; the apparent download/install lines in that log are its previous output being replayed, not a fresh installation. Cold/warm snapshots and logs are retained.
4. Actual public archive consumer smoke passed using the existing `tests/runtime/sdk-import-smoke.mjs` assertions, with only its local packaging preparation omitted and input/archive/module-support anchors redirected to the durable download. All consumer assertions were retained: complete module-graph import coverage, actual scalar/USize boundaries, both release/dev callback round trips, retained closure calls, disposal/zero resource roots, and React host-binding lifecycle imports. The archive was not repackaged. The task-local adaptation/source hashes are recorded in `SDK-SMOKE-ADAPTATION-V2.json`.
5. Existing `native-value-codecs-smoke.mjs` additionally passed against the **actual extracted public SDK on both Wasm profiles**, alongside the source controls: compiler layouts, lexical/mixed recursion, nested parameters/containers, failure cleanup and memory growth. The SDK used was extracted from the durable archive, not the b5 or a3 candidate.

The first task-local archive smoke copy missed one relative test-support import anchor and failed before runtime execution. That authoring error and the corrected green run are preserved; no SDK payload/source defect or mismatch was found, no assertion was weakened, and no product fix was made. React external dependencies were the recorded19.2.7 installed in the owning test workspace. Import/lifecycle checks are not full DOM rendering or downstream widget composition acceptance.

Prior exact public runtime gates remain valid and were not duplicated: anonymous source/runtime fresh owning-library cold/warm build, warm offline preservation, cold offline miss, stage repair and relocated native publication, plus the identical-tree four-job source CI. That evidence is linked by digest in `CHECKPOINT.json`; this phase adds actual durable SDK/default acquisition and both-profile acceptance.

## Consumer handoff and limits

The exact immutable public source/tag/runtime/SDK pair is ready for the coordinator's one handoff to the existing Slides PR85 owner. Slides owns its rebase/pin, stable program regeneration and actual application acceptance; producer qualification does not assert those results. Bench263 stays be01/092, codec/NameMap/Cast/VBP work remains separate, all historical rc4/4.34 releases/pins remain unchanged, and root stays HEAD151538c6 with the same ten WIP paths. No cleanup or consumer repin occurred.

Default producer/SDK acquisition and durable artifact gates are complete. Remaining work is caller-owned downstream acceptance and any separately selected source/worktree retirement. Sole producer publisher/checker remains `vir/toolchain-support`, session01a0f802; its selected publication task is complete at this checkpoint.
