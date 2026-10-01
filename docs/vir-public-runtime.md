# Public runtime qualification

## Current checkpoint

Executed Slides source: `2461cfa777ec66073f0f2dfe21778ebf47d3edd1` on
`feat/vir-prettym-434-minimal` (2026-10-01). Both `lakefile.lean` and
`lake-manifest.json` select VIR `87d7646d1ceb99c94efc92000370b814f83219d2`.
Only the dependency pin changed from the reduced `18707d9` landing.

Lean: 4.34.0 / `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`; VIR version 1.
The public-source successor changes the runtime lock, with no shared API or
runtime payload change. The pure `Except` ABI, role and v2 interface remain.

| Artifact | Exact identity |
| --- | --- |
| Runtime content ID | `832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d` |
| Runtime pack SHA-256 / bytes | `d06bda0aba96547679093da441cd3d9b2b7a9291d1757f16c5c6fcf6ed081ba1` / 1,120,731 |
| Rebuilt program content ID | `97b280b7c42cbed3783f31c98f7753d6eab5b9707f49f6cfbacdde2c0350ef58` |

The lock names the [public release pack](https://github.com/ejgallego/lean-vir/releases/download/resource-832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d/832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d.virres).
Content checks establish identity; this does not assert GitHub-enforced release
immutability. Historical supplied-pack qualification remains at
[`3f7dbc93`](https://github.com/ejgallego/verso-slides/blob/3f7dbc93f10f1ed2ef88ee65dda9019b5c298233/docs/evidence/publication-adoption/README.md).

## Locally executed results

Two independent source archives began without `.lake` or generated carriers:
the root demo and `examples/default-deck` in the second archive. No runtime pack,
build output, package checkout or supplied bytes were copied into them. The
installed Lean toolchain was reused. `lake --no-cache update` fetched ordinary
dependencies; immediately before build both runtime cache and stage were absent
and both VIR checkouts were exactly `87d7646d`.

| Gate | Root / downstream result |
| --- | --- |
| Ordinary `lake --no-cache build`, then `exe demo-slides` / `exe my-talk` | Pass after download retry; 745 build jobs in each context |
| Public runtime acquisition | Anonymous library-owned curl; cache and stage checksum/length match the release |
| Warm `lake --no-cache exe …` with transport blocked | Pass; zero transport calls; pack inode/mtime/size/hash unchanged |
| Native `acquire … --offline` with warm packs | Pass; unchanged packs, zero transport calls |
| Native `acquire … --offline` with empty paths | Expected failure: `RESOURCE_OFFLINE_MISS` names required `832ab095…`; no packs or transport |
| Ordinary build with cache/stage held aside and transport blocked | Expected failure: `RESOURCE_DOWNLOAD_FAILED` retains denied URL naming `832ab095…`; no usable runtime installed |
| Restored packs, warm offline rendering | Pass; unchanged packs, zero transport calls |

The ordinary Lake facet has no `--offline` option. Its transport-denial failure is
not the native command's typed offline miss. The test harness blocks observed
curl/Git/SSH transports; it is not an OS network-isolation claim. No implicit
Wasm source build or fallback was used.

Both first workspace builds received GitHub HTTP 500 during runtime acquisition;
retrying the ordinary build downloaded into still-empty runtime cache/stage.
Native compilation from the failed build was reused. A prior independent `/tmp`
attempt downloaded successfully but exhausted disk space during compilation; it
was not counted as a successful build and its caches were not reused.

A copied native renderer also ran outside its build tree with the demo's existing
image input and no `.lake` directory. Six published manifests and 45 declared
payloads across root, downstream and relocated outputs passed exact hash/length
checks. All three bootstraps use relative resource URLs without producer paths.
The relocation check initially failed when the existing demo image was omitted;
supplying that ordinary deck input resolved it. Static URL checks are not browser
nested-hosting acceptance.

[Commands, results, diagnostic excerpts and replay sources](evidence/public-runtime/results.json)
are retained alongside [replay instructions](evidence/public-runtime/README.md).
No current CI status was queried. Upstream's reported build qualification is
separate from these locally executed consumer results.

## Owners and next actions

- Slides: public acquisition and offline deck gate complete; preserve the minimal
  API/build scope and historical evidence.
- VIR: exact public lock/source supplied; no new consumer API/artifact request.
- Slides: fresh browser acceptance of the reduced renderer, geometry, font/theme/
  resize and retention/performance remain open. No native formatter or browser
  campaign was rerun for this source-only pin update; unchanged runtime/program
  bytes retain their historical coverage without qualifying changed renderer bytes.
