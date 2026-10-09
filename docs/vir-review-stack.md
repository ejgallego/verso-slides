# First Slides formatter patch

This patch adds three formatter commits on top of the shared rendering
refactor in
[PR83](https://github.com/leanprover/verso-slides/pull/83),
`23daa2e3eb45c5838bd7860cc21d06d5089515d7`:

1. Lean PrettyM, the typed VIR entry point, library-prepared assets
   and one-shot initialization.
2. Removal of JavaScript prettyM and connection of existing
   panel/lightbox presentation to Lean formatting and asynchronous
   readiness.
3. Tests, short integration documentation and an ordinary downstream
   deck.

The refactor remains a separate PR. Until it lands, the upstream PR's
combined comparison also includes that prerequisite. Review the three
formatter commits individually to see this patch's scope. The earlier
pre-tag candidate remains preserved on
`feat/vir-prettym-main435-stacked`.

## Released dependency

Lake selects VIR's published `4.35-rc4` tag, locked to
`be01a69de96c49bde7863baf82e3cc4b7cc904fd` in the manifest. Slides and
the release use `leanprover/lean4:v4.35.0-rc4`, compiler
`c29b6dda4f7c20e3eeaa717c4e565663c5cfa364`. Main's Verso and
transitive pins remain unchanged; the example uses the same toolchain.

The ordinary build acquires VIR's public runtime through its owning
library; there is no supplied pack, application recipe, private loader
or Wasm source build. The explicit module-asset API and the formatter
signature remain:

```text
Std.Format → Nat → Nat → Array Pretty.Segment
```

Runtime CID:
`092a746684d66b2c0eea7975a96eecd3f59cd7ec4e4255ffb5092a72e1af70f1`.
Pack SHA256:
`02c4a12f6dd4aed6de5cf6abcdde61d4a1f02fb5f9e55159683eb591e4ee4f90`;
1,016,086 bytes.

Regenerated program CID:
`249096a96d990daaf5d5f9dfb88d2b5dfcbb7ab2a3f53b6f384e79e64c05a945`.
Pack SHA256:
`0a4a2ddba702d9b2fbbe0a04b59232371b86d952a9c6061e47372309e29489d5`;
78,829 bytes. Resource compatibility is 6, interface manifest 12,
runtime ABI 4 and binary package format 11. The old `6cdd` runtime and
`00c4` program are historical evidence; they do not qualify these new
production bytes.

## Qualification

[Retained local release adoption](https://github.com/ejgallego/verso-slides/tree/fd5b7ec43fe0ba9ab635790dc5ad52233d0b3084/docs/evidence/release435-adoption)
records native execution on `db3b10d4` and downstream/browser
completion on `059658e2`, including the exact source changes between
phases. This final review-notes update changes no production or test
bytes.

- Ordinary root and downstream cold/warm builds and rendering: PASS,
  with fresh owning acquisition and no supplied runtime or Wasm source
  build.
- Native driver, 20 Node checks, panel TypeScript and fresh eight-case
  complete native segment/tag corpus: PASS.
- 30 focused Chromium/Firefox checks: PASS in 20.90s, using the actual
  published runtime under root, nested and downstream URLs.
  Annotation/binding/escaping, resize, loading/failure and lightbox
  checks are included.
- Six manifests and 42 payloads match canonical identities, lengths
  and hashes; tracked-source formatting and copyright checks pass.

These are local results. CI is recorded separately on the submitted
PR. Full product/mobile/geometry/font/retention/offline campaigns are
not claimed here.

All unrelated improvements remain in the
[post-landing queue](https://github.com/ejgallego/verso-slides/blob/todo-after-vir-merge/TODO.md):
document teardown/cancellation, font listeners, extra lightbox reflow,
selector and class changes, floating banner, budgets,
mobile/geometry/retention and general asset/output policy. Basic
readiness, error reporting, existing panel resize and detached-probe
cleanup belong to this patch. There is one mandatory formatter, with
no JSON call protocol, export recipe/table, extra library or
JavaScript formatter fallback.
