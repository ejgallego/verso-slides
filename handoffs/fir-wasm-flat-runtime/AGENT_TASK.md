# Task for the FIR wasm-generation agent

Build and publish a separate **FIR Wasm Flat** browser artifact for
the Verso `Std.Format.prettyM` comparison. Do not replace or modify
the current **FIR Wasm** (`PrettyTrace`) control package: the
experiment needs both artifacts at the same time.

Read the FIR repository's `AGENTS.md` and local integration
instructions first. Use the current descendant of the FIR
wasm-generation worktree and keep all generated files inside that
repository's artifact/publish area.

The expected checkouts on the integration machine are:

- FIR: `/home/egallego/lean/fir/.worktrees/wasm-generation`
- Verso source:
  `/home/egallego/lean/verso-slides/.worktrees/vir-pretty-prototype`

Resolve their current branches rather than assuming these paths are a
stable public interface.

## Lean source and entrypoint

Compile the extended, compiler-neutral Lean implementation from the
Verso branch `feat/vir-pretty-prototype`:

- source: `VersoSlides/Pretty.lean`
- source SHA-256 at handoff time:
  `a51b2815e4ea15aaedf8011befeab97145212364bb702010c3e4a16127730eca`
- entrypoint: `VersoSlides.Pretty.formatRenderedForRuntime`
- Lean signature:

    ```lean
    (f : Std.Format) (width indent column : Nat) →
      VersoSlides.Pretty.Rendered
    ```

The fourth argument is intentional and matches the current FIR control
ABI. The Verso panel presently passes `column := 0`, but the artifact
must preserve the complete `(format, width, indent, column)` surface.

If taking a direct dependency on Verso is undesirable for the FIR
integration fixture, vendor this source with its provenance and digest
rather than reimplementing the output transformation in JavaScript.

## What must execute in Wasm

The Wasm entrypoint itself—not a post-call JavaScript adapter—must
execute:

1. `Std.Format.prettyM`;
2. text chunk collection;
3. UTF-8 byte-offset tracking;
4. start-tag, end-tags, and unstyled-newline event construction; and
5. the final text join.

The result is `Rendered { text, events }`. JavaScript may decode that
Lean value into the declared browser object, but it must not derive
the flat event stream from the old `PrettyTrace`. Such a conversion
would reproduce the existing control and invalidate the
output-boundary experiment.

Annotation lookup, HTML escaping/span construction, DOM insertion,
layout, and paint remain outside this artifact.

## Required package contract

Produce a separately checksummed package satisfying:

`demos/vir-pretty/contracts/fir-native-flat-v1.json`

Required files:

```text
BUILD.json
SHA256SUMS
prettyM-browser-adapter.mjs
prettyM.wasm
prettyM.wasm.json
```

The important requirements are:

- BUILD metadata envelope: `fir-prettyM-package-metadata-v2`; this is
  independent of the browser endpoint API and must not be bumped
  merely because the entrypoint or output schema differs;
- browser API: `fir.prettyM.flat.browser/v1`;
- Wasm parameters: four `tobject` values;
- result: `object`;
- zero function imports and zero memory imports;
- one module-owned memory export;
- the same public `PrettyFormat` input adapter and
  `fir.prettyM.module-owned-transfer/v1` ownership protocol as the FIR
  Wasm control;
- output schema: `text-events-utf8/v1`;
- offsets: UTF-8 byte offsets into `rendered.text`;
- event kinds: start tag `0`, end tags `1`, unstyled newline `2`; and
- clean source/toolchain/digest provenance in `BUILD.json`.

Keep the Lean version inside the self-contained package provenance.
For this controlled pair, preserve the current FIR Wasm control's Lean
4.32 public input layout; the host deck itself uses Lean 4.33 and does
not share heap objects with the artifact.

## Browser adapter

Export:

```js
PRETTY_M_BROWSER_API_VERSION = "fir.prettyM.flat.browser/v1";
PrettyFormat;
fetchPrettyMAdapter;
```

The loaded adapter must provide:

```js
adapter.render({ format, width, indent, column });
```

returning at least:

```js
{
  rendered: {
    text: string,
    events: Array<{ offset: number, kind: number, value: number }>
  },
  timings: {
    normalizeMs, allocateMs, encodeMs, prepareMs,
    executeMs, decodeMs, totalMs
  },
  memory: {
    inputBytes, rawObjects, residentAllocationCalls
  }
}
```

`executeMs` must time only the Wasm call. It therefore includes
`prettyM` and Wasm-owned `Rendered` construction. Input preparation
belongs in `prepareMs`; decoding the returned Lean graph belongs in
`decodeMs`.

## Correctness and robustness acceptance

- Check exact text and the complete ordered styling event stream
  against a native Lean oracle running the same
  `formatRenderedForRuntime` definition.
- Cover nested tags, multiple `endTags`, unstyled newlines with
  indentation, non-ASCII text before event boundaries, large
  natural/tag values, and both nonzero initial column and zero column.
- Retain the existing stack-safety stress cases, 1 MiB UTF-8 case,
  memory-growth case, and at least 32 repeated calls on one adapter
  instance.
- Authenticate every published file with `SHA256SUMS`; publish
  atomically and expose the final immutable package path or symlink.
- Run the package's Node smoke test and, if available, its browser
  smoke test.

## Verso-side validation

From the Verso checkout, the integration owner will run:

```console
python3 demos/vir-pretty/scripts/validate-native-flat-package.py \
  /absolute/path/to/the/published/package
```

When it passes, the package can be staged as `lean-native-flat/`. The
deck will then register the internal backend ID `native-flat`, present
it as **FIR Wasm Flat**, and automatically add the controlled **FIR
output boundary** test:

```text
FIR Wasm       browser Format → PrettyTrace → shared segments
FIR Wasm Flat  browser Format → Rendered text/events → shared segments
```

Hold the compiler/runtime, browser input adapter, format corpus,
width, indent, column, and shared host materialization fixed. Report
Execute, Output normalization, payload/memory, and Pipeline total
separately.

For broader comparisons:

- compare VIR and FIR **Backend execute** only when both compile this
  exact Lean entrypoint and output surface;
- compare FIR Wasm Flat with JS using **Pipeline total
  (pre-insertion)** for the product-level path;
- do not describe JS Execute as pure `prettyM`: it also includes
  JS-owned tagged-segment construction; and
- if a later Lean surface returns HTML directly, compare pipeline
  total unless the runtime exposes an internal layout/HTML split.

## Non-goals for this artifact

- Do not add package-resident format IDs; that is a separate
  input-residency experiment.
- Do not return HTML or perform annotation lookup.
- Do not change the current FIR Wasm control package or its API.
- Do not perform `PrettyTrace` → flat-event conversion in JavaScript.
- Do not couple the artifact to the Verso benchmark webapp or slide
  UI.

When handing the artifact back, provide its absolute published path,
source commit/toolchain, Wasm digest and size, smoke-test output, and
any intentional deviation from this contract.
