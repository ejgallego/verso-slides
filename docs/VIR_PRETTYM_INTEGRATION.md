# VIR `prettyM` integration

This review branch replaces one handwritten JavaScript algorithm:
`Std.Format.prettyM`. The browser still owns panel selection, DOM
measurement, annotation lookup, HTML generation, and DOM updates.

The boundary is deliberately typed and narrow:

```text
compact browser format
  -> Std.Format object ABI
  -> VersoSlides.VirPrettyM.formatSegments
  -> Array { text, tags }
  -> existing JavaScript HTML/panel pipeline
```

The deck initializes one generic `window.versoVir` runtime. The panel
waits for that initialization once, and `pretty.js` calls
`window.versoVir.call` directly. Formatter-specific status objects and
dispatch events are not part of the integration.

The pinned VIR module exports ordinary, unshared Wasm memory, so this
integration does not require cross-origin isolation.

Build the complete demo with:

```sh
lake exe demo-slides
```

The export program is configured entirely in Lake. A named, one-root
library supplies both the stable browser program ID and its Lean
module; the ordinary executable depends on that library's
`virWebAssets` facet:

```lean
lean_lib «vir-prettym» where
  roots := #[`VersoSlides.VirPrettyM]

lean_exe «demo-slides» where
  root := `Main
  needs := #[`@/«vir-prettym»:virWebAssets]
```

There is no source-side JSON configuration. The facet owns package
generation, SDK selection and verification, and emits one
dependency-cone package set plus a generated `VIR_WEB_ASSETS.json`
discovery manifest under `.lake/build/vir/web-assets/vir-prettym/`.

`slidesMain` installs that generated tree through
`Config.extraAssetDirs`; the small, source-controlled bootstrap
remains an embedded `Config.extraAssets` entry. VIR's staged browser
helper validates the generated manifest and constructs the selected
runtime, so the client only chooses the manifest and program, starts
it, and owns disposal. It does not run nested Lake or npm commands,
parse dependency manifests, or know the internal SDK/package-set
producer layout.

This branch pins a consumer-validated PR #161 revision, so the
complete demo is available now. The pin should move to PR #161's merge
commit once it lands; that is the only remaining dependency update for
this review branch.
