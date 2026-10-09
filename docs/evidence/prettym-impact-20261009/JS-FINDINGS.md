# VIR JavaScript findings for a future upstream handoff

Inspected immutable VIR3e7dbcf0615305c83bdcb9aa1892ac8b22087d8e and the actual
published runtime6cddc4b8. JavaScript SHA256
b216a5964e9cdc4115877eaa71a27fa32108a40c805ff87f0f29bb51700cf039,
239305 raw /46896 gzip bytes. This is the selected Slides pair, not an assertion
about the latest VIR source. Reconcile findings with current producer code before
implementation. No message to VIR sent yet; no producer or application code edit.

## Ranked findings

### 1. Release JavaScript is unminified — concrete packaging win

scripts/resources/pack-runtime.mjs bundles web/src/resource-program.js but does
not enable minify. Offline transformation of the exact shipped bytes with
esbuild0.27.7 gives127333 raw /33861 gzip bytes; keeping function names gives
140760 raw /37117 gzip bytes. Original239305 /46896. Diagnostics-preserving
minification saves98545 raw /9779 gzip bytes. These are size-only estimates,
not behavioral qualification or a selected runtime. A production change needs
producer qualification and a new immutable runtime pack/CID.

### 2. Eager browser/infoview providers in the pure formatter's bundle

The43,987-byte host-integration group includes host-state/shared machinery,
so43KiB is not a proved removable saving. Its browser/timer/animation/infoview
provider modules plus their aggregate factory account for22,474 bytes:
vir-active-host-bindings4893, vir-dom-host-bindings5398,
vir-infoview-host-bindings830, vir-infoview-panel-bindings5339,
vir-host-bindings6014. That includes canvas/property forwarding, DOM events,
timer/animation registration and infoview providers.

vir-host-bindings.js:createBrowserHostBindings spreads all provider maps;
web/src/vir-runtime.js selects it as the default provider factory, and
factory-core.js:instantiateModule calls that factory during instantiation.
The admitted formatter has one pure export and no hostImports. There is no
need for these services in its typed interface. A producer-owned separation
of core invocation from optional host capabilities is worth investigating.
Retain any required Wasm import bridge, shared lifecycle/ownership machinery and
full behavior for programs that do use host imports. This does not propose an
application-private loader, formatter fallback, or extra Slides configuration.

### 3. Kernel syntax conversion is embedded in the general object-value mixin

object-values.js contributes44,208 emitted bytes. Thirteen methods implementing
Lean.Expr/Lean.Level/literal construction and lifting account for17,501 bytes,
before their support constants/helpers. Largest: makeObjectExpr3907,
liftObjectExpr3961, makeObjectLevel1877, liftObjectLevel1604 bytes.
These are separate kernel syntax codecs, not Std.Format's recursive constructors.
The root's complete admitted type graph has tags Nat, Int, Bool, String,
SimpleEnum, Array, Structure, CustomInductive and RecursiveSelf. No Expr,
Function or opaque Resource crosses its host ABI. Lean-internal closures are
not host callbacks. formatter-interface-use.json retains this observed graph.

The single dynamic makeObjectValue/liftObjectValue dispatcher references all
methods, so ordinary bundling retains them. A separate syntax capability/mixin
could let the core value path avoid this code when no admitted type needs it.
Keep the generic recursive constructor/structure/array/scalar codecs required
by Std.Format and Array Segment; do not replace them with app-specific encoders.
17.1KiB is a raw attribution, not a measured final compressed-bundle saving.

### 4. Repeated construction scaffolding — maintainability candidate

makeObjectLevelBinary and makeObjectExprBinary repeat the same lowering of two
children, zero-result check, transfer-on-success and finally-release pattern.
Expression binding/let/projection helpers repeat related ownership logic.
There may be room to reuse a carefully specified consuming-constructor helper.
This is not a claim of a large gzip saving. Do not delete cleanup or flatten
nested finally scopes without preserving partial construction, native ownership
transfer and failure semantics. Existing helpers already consolidate some paths.

### 5. Resource admission repeats work across adapters — investigate boundaries

resource-program.fetchPayloads hashes each program payload. The private verified
byte adapter then enters factory.fetchIrPackageSet, which checks package lengths
and hashes again. resource-program validates/reads IR manifests for compatibility
and expected exports; factory.resolvePackageSetInput snapshots bytes and validates
members again before installation. A private admitted snapshot could possibly
carry reusable validation results through this path.

This is a source-level opportunity, not a measured hotspot or deletion request.
Public raw/deferred inputs are mutable and must still be copied/validated.
Native admission, JS input admission and publication checks protect different
boundaries and cannot simply be removed as duplicates. The factory already
avoids another JS validation by installing its validated snapshot directly;
credit that completed simplification rather than requesting it again.

## Things inspected that are already handled

- object-abi.js:objectLayoutPlan already caches plans in a WeakMap.
- managed-core.js:readPackageManifest freezes the admitted manifest tree.
- ManagedRuntimeFactory already installs its validated snapshot directly rather
  than going through the public raw-byte loader again.
- Small facade/re-export files are a few hundred bytes, not a size driver.
- finally blocks/retired-object checks protect native and JS ownership. Their
  verbosity alone is not evidence that they can be removed.

## Attribution and data

js-module-blocks.json records39 emitted module blocks whose byte counts sum to
239305. js-breakdown.json groups them by responsibility. object-values-methods.json
uses TypeScript AST method spans in the emitted bundle, including leading
comments/whitespace. No gzipped per-method saving is claimed because compression
shares dictionaries. js-minification-estimate.json uses the same Python gzip
level9/mtime0 as the published-file inventory.

All before/after build/site measurements, raw logs, sources/commands and exact
file inventories are alongside. Legal/notice analysis is in README.md. Findings
are ready to send after maintainer sequencing; first Slides landing/tag gates
remain unchanged. No benchmarks or semantic/browser tests rerun for this audit.
