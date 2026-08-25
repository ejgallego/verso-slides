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

The executable depends directly on VIR's proposed
`+VirPrettyM:virBrowser` facet. That facet owns package generation,
SDK selection and verification, and a self-contained browser bundle at
`.lake/build/vir/browser/VirPrettyM/`.

`slidesMain` installs that generated tree through
`Config.extraAssetDirs`; the small, source-controlled bootstrap
remains an embedded `Config.extraAssets` entry. The client does not
run nested Lake or npm commands, parse dependency manifests, or know
the internal SDK/package-set producer layout.

This branch specifies the consumer contract for the not-yet-landed VIR
facet. Until the pinned VIR revision provides `:virBrowser`, library
and asset-directory tests are runnable, but the complete `demo-slides`
target is intentionally unavailable.
