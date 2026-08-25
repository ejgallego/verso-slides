# Task for the FIR wasm-generation agent

Build and atomically publish a separate **FIR Wasm HTML** browser
artifact for the Verso `Std.Format.prettyM` comparison. This is an
additional pipeline breadth: do not replace the existing **FIR Wasm**
(`PrettyTrace`) or **FIR Wasm Flat** packages.

Read the FIR repository's `AGENTS.md` and local integration
instructions first. The Verso integration checkout at handoff time is:

```text
/home/egallego/lean/verso-slides/.worktrees/vir-pretty-prototype
```

Resolve branches and artifact publish locations from current
repository state; do not treat local absolute paths as a public ABI.

## Lean surface

Compile the compiler-neutral implementation in:

```text
VersoSlides/Pretty.lean
```

The current refresh source is the pushed fork branch:

```text
repository: https://github.com/ejgallego/verso-slides.git
branch:     feat/vir-pretty-prototype
commit:     970b071b73adc6e68c6de00bc183460f76d97731
```

Its `VersoSlides/Pretty.lean` SHA-256 is:

```text
f4a9c956a78a5781b4a6963059e157c35dc20fc14b0081350a280a162ac7464d
```

Entrypoint:

```lean
VersoSlides.Pretty.formatHtmlForRuntime
```

Signature:

```lean
(f : Std.Format)
  (annotations : Array VersoSlides.Pretty.TaggedAnnotation)
  (width indent column : Nat) → String
```

This exact source was checked directly with `leanprover/lean4:v4.33.0`
as well as through the deck's Lean 4.34-rc2 build. The FIR artifact
should remain on Lean 4.33. If FIR vendors the source, retain its
provenance and digest. Keep the concrete Lean version inside the
self-contained artifact metadata; the browser boundary is
version-independent and no Lean heap is shared with the host deck.

The refresh adds no ABI or output-schema change. It replaces repeated
reverse linear annotation-table scans with a sorted-table
binary-search path while retaining the old fallback for unsorted input
and the old last-duplicate-wins behavior. Generated browser tables are
already sorted. Full consumer evidence is recorded in:

```text
performance-cards/pretty/VERSO-001-annotation-lookup.md
```

## Compiled breadth

The Wasm call itself must own the complete pre-DOM pipeline:

1. `Std.Format.prettyM` layout;
2. active tag-stack maintenance;
3. innermost annotation lookup;
4. HTML escaping for text, class names, and binding attributes; and
5. construction of sibling text and `<span class="… token" …>` HTML.

The browser owns only adapter input construction, decoding the
returned Lean `String`, and the common `innerHTML` commit. It must not
reconstruct HTML from `PrettyTrace`, flat events, segments, or a
render plan in JavaScript.

The expected output semantics are byte-for-byte equivalent to the
shared JS renderer:

```html
<span
    class="{escaped cssClass} token"
    data-binding="{escaped binding}">
    {escaped text}
</span>
```

The `data-binding` attribute is omitted for `none`. Newline/indent
output is unstyled. Nested tags select the innermost active tag that
has an annotation.

## Package contract

The package must satisfy:

```text
demos/vir-pretty/contracts/fir-native-html-v1.json
```

Required files:

```text
BUILD.json
SHA256SUMS
prettyM-browser-adapter.mjs
prettyM.wasm
prettyM.wasm.json
```

Important requirements:

- BUILD metadata envelope: `fir-prettyM-package-metadata-v2`; this is
  independent of the browser endpoint API and must not be bumped
  merely because the entrypoint or output schema differs;
- browser API: `fir.prettyM.html.browser/v1`;
- five `tobject` Wasm parameters and one object result;
- zero function imports and zero memory imports;
- one module-owned memory export;
- the existing `PrettyFormat` browser input factory and module-owned
  transfer ownership protocol;
- output schema: `verso-token-html/v1`; and
- complete clean source/toolchain/digest provenance in `BUILD.json`.

The adapter module must export:

```js
PRETTY_M_BROWSER_API_VERSION = "fir.prettyM.html.browser/v1";
PrettyFormat;
fetchPrettyMAdapter;
```

The loaded adapter must accept:

```js
adapter.render({
  format,
  annotations: Array<{
    tag: number,
    annotation: { cssClass: string, binding: string | null }
  }>,
  width,
  indent,
  column
});
```

and return at least:

```js
{
  html: string,
  timings: {
    normalizeMs, allocateMs, encodeMs, prepareMs,
    executeMs, decodeMs, totalMs
  },
  memory: {
    inputBytes, rawObjects, residentAllocationCalls
  }
}
```

`executeMs` must time only the Wasm call and therefore includes
layout, annotation resolution, escaping, and HTML construction.
Annotation and format heap construction belong in `prepareMs`;
returned-string decoding belongs in `decodeMs`.

## Acceptance tests

- Compare exact HTML against native Lean running the same entrypoint
  and against the Verso JS HTML candidate.
- Cover ascending, unsorted, and duplicate-tag annotation tables;
  unsorted input must retain existing lookup results and sorted
  duplicates must select the final matching entry.
- Cover `&`, `<`, `>`, and `"` in text, CSS classes, and binding
  values.
- Cover no annotation, sparse tag IDs, nested tags, multiple
  `endTags`, and unstyled newline indentation.
- Cover non-ASCII text, nonzero initial column, a 1 MiB UTF-8
  workload, memory growth, and at least 32 repeated calls on one
  adapter instance.
- Authenticate every published file and publish atomically.

## Verso integration

Validate the package with:

```console
python3 demos/vir-pretty/scripts/validate-native-html-package.py \
  /absolute/path/to/the/published/package
```

Then stage it as:

```text
demos/vir-pretty/_artifacts/lean-native-html/
```

The assembly script already detects, validates, configures, and copies
that directory. Until it exists, the matrix truthfully shows the **FIR
Wasm × HTML** cell as unsupported; once present it registers
`native-html` and the cell becomes selectable automatically.

When handing the artifact back, provide the immutable package path,
source and toolchain commits, Wasm digest and size, smoke-test output,
and any intentional contract deviation.

For this refresh, reply in the FIR canonical mailbox thread opened by
`VERSO-W7-20260822-003`. Do not overwrite the existing accepted
package or its consumer seed; publish a new immutable package and
update the producer's atomic current pointer only after all package
gates pass.
