# Building a VIR-backed deck

This local integration branch supports Lean 4.34.0-rc2 and the
reviewed VIR producer `6e68a9e7599ffb82ab198566715d345eb6c6c9ed`. That
producer is a frozen input, not a published release promise. Acquire
its matching SDK archive before building; a deck build
verifies/installs the SDK, never builds it with WASI. Missing or
mismatched SDK inputs are errors, not a request to rebuild a runtime.

During local review, the exact producer commit must also be available
to Git; the acceptance harness supplies command-local URL mappings to
independent local dependency clones. No public release or live
dependency pin is changed here.

## Quick start

With a matching archive already acquired:

```sh
export VIR_SDK_ARCHIVE=/absolute/path/to/lean-vir-sdk.tar.gz
lake build demo-site
python3 -m http.server -d _slides
```

The reviewed archive's SHA-256 is
`75ae0554f0175d9a3dd4f12107b5883d364a72994e24da18192bc5ef55d9db1b`.
The ordinary `lake exe demo-slides` command still uses the JavaScript
renderer; the artifact-aware target opts into VIR. Browser modules
need HTTP, not `file:`. All generated runtime assets are local to the
site; no CDN is required.

## A separate presentation project

[examples/vir-deck](../examples/vir-deck) is a complete small deck.
Its in-tree path dependency is only a convenience: in a separate
repository, replace that `require` with a Git dependency on the exact
Slides commit being reviewed. The acceptance script below tests that
Git-dependency shape independently.

The example deliberately uses `talk-build` instead of `.lake/build`
and defines one `MyTalk.Runtime` module containing the formatter plus
a deck-owned `answer`. It imports the normal Slides library; it does
not depend on a nested experiment. The root owns exports/startup and
is the sole root of one library:

```lean
lean_lib «talk-runtime» where
  roots := #[`MyTalk.Runtime]

library_data virWebAssets : System.FilePath

@[default_target] target «deck-site» (pkg) : System.FilePath := do
  let some lib := pkg.findLeanLib? `«talk-runtime» | error "missing talk-runtime"
  let assets : Job System.FilePath ← fetch <| lib.facet `virWebAssets
  let exe ← «my-talk».fetch
  let output := pkg.dir / ((get_config? deckOutput).getD "_slides")
  assets.bindM fun manifest => exe.mapM fun executable => do
    proc { cmd := executable.toString
           args := #["--vir-manifest", manifest.toString, "--output", output.toString]
           env := ← getAugmentedEnv }
    return output / "index.html"
```

This is an ordinary Lake target, not a new configuration language. The
`library_data` declaration makes the facet's result type visible to
this Lakefile; it does not implement the producer. The job waits for
both assets and the executable, then passes the **actual returned
manifest path**. A `needs` dependency alone would order the build
without passing that value.

`Main.lean` forwards its arguments to the generator:

```lean
public def main (args : List String) : IO UInt32 :=
  slidesMain (doc := %doc MyTalk.Slides) (args := args)
```

Build the downstream deck with:

```sh
lake build deck-site
lake -R -KdeckOutput=published/my-talk build deck-site
python3 -m http.server -d published
```

Use `-R` when changing `deckOutput`: this Lean/Lake version caches
configuration elaboration, including `get_config?`. Visit `/my-talk/`
for the custom output. The default `_slides` output remains separate.
The target returns the generated `index.html` path and leaves artifact
location/layout entirely to VIR.

## Responsibility boundary

- VIR assembles one dependency-cone package set, SDK and loader,
  returning `VIR_WEB_ASSETS.json`. SDK acquisition is separate from
  generating IR assets.
- The deck's Lake target chooses its application root and final output
  location. Imported contributions need explicit root-owned wrappers;
  this does not merge independent programs or heaps.
- `slidesMain` accepts `Config.virManifest` or `--vir-manifest`,
  validates the source, and copies the manifest's parent under the
  site's owned `vir/` directory. Replacement removes stale files only
  there; unrelated site files survive. No consumer reconstructs a
  dependency's `.lake` paths.
- The page bootstrap resolves URLs relative to its own script, loads
  the singleton with the SDK's `irPackageSet` semantics, creates one
  runtime and runs startup. A persisted `pagehide` keeps that runtime
  for back/forward-cache restoration; a non-persisted exit disposes
  it. Panels wait for initialization, which checks the formatter
  export and its arity before running startup hooks.
- JavaScript retains DOM measurement, compact-Format adaptation and
  tagged segment-to-HTML rendering. Lean/VIR performs
  `Std.Format.prettyM` layout. This is not an all-Lean DOM renderer.

The selected root must export `formatSegments` with the same signature
as `VersoSlides.VirPrettyM.formatSegments`. A deck adding functions
selects a composite root such as `MyTalk.Runtime`; it does not load
another runtime. Once `window.versoVirReady` resolves, the deck can
call its other root exports through the returned runtime. VIR's
current typed ABI returns Nat values as decimal strings, including
segment tags. The loader and ABI are versioned together.

## Focused acceptance

From the Slides checkout, after building its dependencies:

```sh
python3 scripts/test-external-vir-deck.py --sdk-archive "$VIR_SDK_ARCHIVE"
uv run --project browser-tests pytest browser-tests/test_external_vir_deck.py \
  --site-dir /absolute/path/from/result/siteRoot --browser=all
```

The script retains its independent Git-dependency project, logs and
`result.json` under `_test`. It tests the returned path, custom build
directory, default/custom outputs, stale-shard replacement, unrelated
files and SDK failure/recovery. It copies matching dependency build
caches to bound cost; this is **not** an empty-cache or cache-only
compiled-input consumer claim.

The browser test runs real Wasm/prettyM and the deck-owned function
under a URL prefix, rejects network requests outside the local server,
and observes runtime creation/startup/disposal at the SDK boundary
across reload. Its observation wrapper is test-only; production code
contains no lifecycle counters. Persisted lifecycle events are also
tested deterministically, alongside actual browser history navigation
(whose cache eligibility is browser policy) and early
missing-formatter diagnostics. The installer tests explicitly reject
replacement of the built-in `lib/` directory.
