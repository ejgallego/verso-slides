# Unconditional VIR panel integration

This branch is the base review for using VIR in Verso Slides. It is a
concrete replacement, not a backend-selection or benchmarking API: the
ordinary demo deck always uses a resident Lean/VIR component for
semantic panel rendering.

## Boundary

Lean owns:

- the resident `Std.Format`, annotation, goal, and signature values;
- `Std.Format.prettyM` and annotation resolution;
- goal/signature component construction; and
- React VDOM construction and commit.

JavaScript owns only browser capabilities:

- source-element discovery, focus, and panel lifecycle;
- the two-pass structural mount and DOM measurement;
- resize observation and the per-source width cache; and
- loading one shared VIR runtime and deck package.

The browser ABI is intentionally narrow:

```text
VirPanelRegistry.mountContent(selector, contentId, widths, measureOnly) -> Bool
VirPanelRegistry.unmount(selector) -> Bool
```

No goal JSON, `Std.Format`, annotation table, HTML string, or
recursive VDOM crosses that boundary. The generated deck contains
numeric resident content IDs. A structure-only mount exposes cell
geometry, after which the host supplies integer column widths for the
final mount.

## What the base review includes

- `VersoSlides.Pretty`: the compiler-neutral semantic render plan;
- `VersoSlides.Panel.Component`: the compiler-neutral resident panel
  model;
- `integration/vir-panel/VirPanel.lean`: the VIR/React view;
- a small renderer hook in the ordinary panel lifecycle;
- the runtime loader, geometry adapter, and component adapter;
- deterministic generation of the resident deck package; and
- Lean, TypeScript, and real-browser smoke coverage.

The base review deliberately excludes backend selection, JavaScript
semantic fallback code, timing instrumentation, FIR and LLVM
candidates, comparison matrices, benchmark campaigns, dashboards, and
performance cards. Those are stacked consumers rather than
prerequisites for understanding the product change.

## Reproducible build

The integration project pins VIR commit
`a7a54ce4ecea986bca899ec7ee6ebe5cd0781ffb`. Run:

```text
scripts/build-vir-panel-demo.sh
python3 -m http.server 18340 --bind 127.0.0.1 --directory _slides
browser-tests/.venv/bin/python scripts/smoke-vir-panel-demo.py http://127.0.0.1:18340
```

The build performs these steps:

1. generate the ordinary Verso Slides demo;
2. replace its JavaScript semantic formatter with the geometry-only
   host;
3. assign stable resident IDs and generate `VirPanelRegistry.lean`;
4. compile the reached Lean closure to a VIR package set;
5. bundle the pinned browser React runtime and stage its Wasm; and
6. copy only the direct runtime/component assets into `_slides`.

The pinned VIR module uses ordinary, unshared Wasm memory. The demo
therefore runs on a normal HTTP origin without cross-origin isolation
or a service worker.

Generated files and fetched dependencies remain under this
repository's worktree and are ignored by Git. Set
`LEAN_VIR_RUNTIME_DIR` to an already built checkout at the pinned
commit to reuse its browser runtime; otherwise the build prepares the
pinned dependency itself.

## Failure behavior

The branch does not ship the JavaScript semantic formatter as an
alternate implementation. Until the asynchronous runtime is ready—or
if it fails—the panel retains Verso's already-rendered static content.
Once ready, the host reflows an active panel through VIR. This
preserves readable slides without hiding which implementation owns
semantic rendering.
