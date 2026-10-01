# Reduced-renderer browser checkpoint

Executed test source: `16e748ab7978e39b30d9fe0c804882461785de6d` (2026-10-01).
Production source is unchanged from `b019155`; the successor adds only a native
geometry corpus, browser tests and collection gating. VIR remains exact
`87d7646d1ceb99c94efc92000370b814f83219d2`, runtime `832ab095…`, program `97b280b7…`.
[Complete pair, commands and measurements](evidence/browser-acceptance/results.json).

This is a bounded browser checkpoint, **not closure of overall product acceptance**.
The public acquisition/offline gate remains independently accepted at its recorded
`--no-cache` scope. No upstream API, pin, pack, formatter or publisher change was
made for this checkpoint.

## Executed locally

Warm `lake build demo-slides test-pretty test-fixtures-build` passed. Fresh root
and nested sites were rendered from the reduced renderer. The previously accepted
public-cold downstream output was reused unchanged; both native geometry and
browser tests are fresh. Published byte inventories retain the exact pair.

| Check | Result |
| --- | --- |
| Native production-wrapper checks | 101 passed |
| Focused Chromium / Firefox tests | 100 passed, zero skips/failures |
| Native geometry oracle | 512 test-only cases: four documents × widths 1–128 |
| Measured layout comparisons | 48: four documents × three viewports × two palettes × two browsers |
| Real delayed font download | Both browsers: native column budget 24 → 28; three lines → two |
| Repeated direct formatting | 640 checked calls per browser; capacity stays 4 MiB |
| Repeated panel reflow | 64 per browser; 21 descendant nodes each time, zero hidden probes |
| Retry / teardown | Eight retries dispose prior programs; persisted/terminal pagehide behavior passes |
| Chromium GC diagnostic | One live memory wrapper after retries; Firefox GC was not forced |

Browsers: Chromium `145.0.7632.6`, Firefox `146.0.1`. The focused suite includes
root/nested/downstream hosting, exact native segments, tags, classes, bindings,
escaping, interaction, rejection/recovery, loading/failure/retry/cancellation,
reentrant loading notifications, actual panel reflow and lightbox resize/theme
behavior. Text comparisons preserve whitespace and full tag associations.

Geometry uses viewports 480×812, 800×600 and 1280×720, with controlled divider
ratios and light/dark token palettes. Actual DOM Range bounds must fit the visible
cell, allowing one CSS pixel for rounding and the unavoidable extent of an atomic
text node. Lean cannot split that node; very narrow cells can still clip it.
This criterion does not claim that every unbreakable expression fits.

The test records the actual formatter measurement before inserting text. Intrinsic
table sizing can widen a cell afterward; deriving the requested column count from
that later width produced an invalid early test comparison. The font check holds
and releases the published KaTeX Typewriter download and observes the real
FontFaceSet event, changed metrics, fresh layout and exact native output.

Timing samples cover 128 facade calls plus complete result checks per batch.
They exclude initialization, DOM reflow and paint, and are observational rather
than a speed comparison or product latency target. Wasm capacity, DOM counts and
live JS memory wrappers measure different things; this is a bounded retention
check, not proof of leak freedom for arbitrary workloads or full unload.

## Separate mobile UI finding

The [retained reproducer](evidence/browser-acceptance/mobile-restore-repro.py)
and [two-browser observations](evidence/browser-acceptance/mobile-restore-repro.json)
show that resizing 800 → 375 → 800 leaves restored panel blocks without click
handlers, while the current VIR program remains active and formats correctly.
Reveal's 435px scroll-mode transition restores slide HTML through `innerHTML`;
the original block becomes detached and its replacement has no active selection.

The base `a51f7e5` has the same startup-only panel setup, and the bundled Reveal
restore mechanism is unchanged. This attribution is source inspection plus the
current-pair browser reproduction, not a browser campaign against the base.
Fresh 375px proof selection also did not qualify during test development. The
passing geometry matrix deliberately stays above that scroll-mode threshold.
Mobile view restoration/navigation needs a separate generic panel lifecycle fix;
it is not a VIR loader or formatter API request. No production workaround was
added to this first landing.

## Current owners and next actions

- Slides: bounded semantic/font/geometry/retention checkpoint executed and ready
  for review; retain the minimal landing and earlier accepted acquisition evidence.
- Slides: the maintainer scheduled the separate generic mobile panel lifecycle
  correction **after the first Slides patch lands**, including listener/observer
  cleanup and a real completion/interaction regression. The mobile product
  limitation remains recorded; no correction is part of the formatter landing.
  See the [scope audit and deferred work queue](vir-followups.md).
- [Fresh downstream qualification](evidence/landing-qualification/README.md)
  passes with default and explicitly enabled artifact caching, separately from
  the accepted `--no-cache` cold gate. Longer retention and broader font/geometry
  coverage are not established by these bounded measurements.
- VIR: no new shared contract, artifact choice or producer action required.

No Slides CI, new producer CI, broad creation/bounds browser campaign, or sampled
performance attribution was run. [Retained logs, hashes and replay guidance](evidence/browser-acceptance/README.md)
separate actual execution from historical acceptance and inspected source.
