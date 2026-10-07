"""Measured presentation and bounded retention of the emitted mandatory formatter.

Requires --vir-site-acceptance and a fresh --geometry-corpus native oracle.
Timing excludes loading/paint. Memory capacity is not a live-allocation count.
"""
import json
import os
from pathlib import Path

import pytest
from playwright.sync_api import expect

from test_vir_prettym_site import open_demo, open_proof_panel


def record(request, browser, value):
    request.node.user_properties.append(("observations", json.dumps({
        "browser": browser.browser_type.name, "version": browser.version, **value})))


def install_goal(block, case):
    block.evaluate("""(block, c) => {
        const tactic = block.querySelector('.tactic');
        const source = tactic.querySelector(':scope > .tactic-state');
        source.setAttribute('data-rich-format', JSON.stringify([{
            hypotheses: [], goalPrefix: '⊢ ', ppConclusion: {
                fmt: c.format, annotations: {
                    '7': {cssClass: 'const', binding: 'outer'},
                    '8': {cssClass: 'var', binding: 'inner'},
                },
            },
        }]));
        const original = window.formatToHtml;
        window.formatToHtml = (format, annotations, width, measurer) => {
            block.querySelector('.info-panel').geometryCall = {
                columns: Math.max(1, Math.floor(width / measurer.spaceWidth)),
                width, space: measurer.spaceWidth,
            };
            return original(format, annotations, width, measurer);
        };
        try { tactic.dispatchEvent(new MouseEvent('click', {bubbles: true})); }
        finally { window.formatToHtml = original; }
    }""", case)


# Range rectangles measure actual text layout, including tags, hard newlines,
# Unicode glyph fallback and Reveal's transform. Columns remain Lean's policy.
MEASURE = """(panel, c) => {
    const span = panel.querySelector('.reflowed[data-fmt-idx]');
    const cell = span.closest('.type');
    const measurer = createDOMMeasurer(panel);
    let width, space;
    try { width = measurer.measureElWidth(cell); space = measurer.spaceWidth; }
    finally { measurer.cleanup(); }
    const call = panel.geometryCall;
    const columns = call.columns;
    const rect = cell.getBoundingClientRect();
    const scale = rect.width / width;
    const panelRect = panel.getBoundingClientRect(), panelStyle = getComputedStyle(panel);
    const visibleWidth = (panelRect.right - parseFloat(panelStyle.paddingRight) * scale - rect.left) / scale;
    let maxRight = rect.left;
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()); ) {
        let offset = 0;
        for (const line of node.textContent.split('\\n')) {
            if (line.length) {
                const range = document.createRange();
                range.setStart(node, offset); range.setEnd(node, offset + line.length);
                for (const r of range.getClientRects()) maxRight = Math.max(maxRight, r.right);
            }
            offset += line.length + 1;
        }
    }
    const style = getComputedStyle(span), canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    let largestAtom = 0;
    const pending = [c.format];
    while (pending.length) {
        const f = pending.pop();
        if (typeof f === 'string') {
            for (const line of f.split('\\n')) largestAtom = Math.max(largestAtom, context.measureText(line).width);
        } else if (Array.isArray(f)) {
            if (f[0] === 4) pending.push(f[1], f[2]);
            else if ([3, 7].includes(f[0])) pending.push(f[2]);
            else if ([5, 6].includes(f[0])) pending.push(f[1]);
        }
    }
    return {columns, width: call.width, space: call.space, postLayoutWidth: width,
        visibleWidth, extent: (maxRight - rect.left) / scale, largestAtom,
        whiteSpace: style.whiteSpace, text: span.textContent,
        segments: window.testSegmentsForJSON(window.versoVirFormatSegments(c.format, columns, 0)),
        tagged: [...span.querySelectorAll('[data-format-tags]')].map(el => ({
            text: el.textContent, tags: el.dataset.formatTags.split(' '),
        })), probes: panel.querySelectorAll('[style*="visibility: hidden"]').length};
}"""


def assert_native_layout(actual, oracle):
    segments = oracle["result"]["segments"]
    assert actual["segments"] == segments
    assert actual["text"] == "".join(s["text"] for s in segments)
    assert actual["tagged"] == [s for s in segments if s["tags"]]
    assert actual["whiteSpace"] == "pre" and actual["probes"] == 0
    # Pixel extents are recorded observations; the semantic oracle is Lean.


@pytest.mark.parametrize("light", [False, True], ids=["dark", "light"])
def test_measured_panel_geometry_matches_native_at_narrow_and_wide_viewports(
        page, browser, server, site_dir, request, light):
    corpus = json.loads((site_dir / "geometry-corpus.json").read_text())
    oracle = {(c["name"], c["width"]): c for c in corpus}
    formats = [c for c in corpus if c["width"] == 1]
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    observations = []
    # Keep this geometry matrix above Reveal's 435px scroll-mode threshold.
    # Mobile scroll-mode restoration is a separate, retained UI reproducer.
    for viewport in [{"width": 480, "height": 812}, {"width": 800, "height": 600},
                     {"width": 1280, "height": 720}]:
        page.set_viewport_size(viewport)
        open_demo(page, server)
        block, panel, _ = open_proof_panel(page)
        ratio = {480: 0.82, 800: 0.65, 1280: 0.5}[viewport["width"]]
        block.evaluate("""(el, code) => {
            el.style.setProperty('--code-ratio', code + 'fr');
            el.style.setProperty('--panel-ratio', (1 - code) + 'fr');
        }""", ratio)
        block.evaluate("(el, light) => el.closest('section').classList.toggle('slide-light-bg', light)", light)
        page.evaluate("async () => { await document.fonts.ready; await new Promise(requestAnimationFrame); }")
        for case in formats:
            install_goal(block, case)
            actual = panel.evaluate(MEASURE, case)
            assert_native_layout(actual, oracle[(case["name"], actual["columns"])])
            observations.append({"viewport": viewport, "codeRatio": ratio, "case": case["name"], **actual})
        path = os.environ.get("VERSO_ACCEPTANCE_ARTIFACT_DIR")
        if path:
            page.screenshot(path=str(Path(path) / f"{browser.browser_type.name}-{viewport['width']}-{'light' if light else 'dark'}.png"))
    assert errors == []
    record(request, browser, {"light": light, "layouts": observations})


def test_actual_delayed_font_download_reflows_current_native_layout(
        page, browser, server, site_dir, request):
    corpus = json.loads((site_dir / "geometry-corpus.json").read_text())
    cases = {c["width"]: c for c in corpus if c["name"] == "fill"}
    held = []
    page.route("**/KaTeX_Typewriter-Regular.woff2", lambda route: held.append(route))
    open_demo(page, server)
    block, panel, _ = open_proof_panel(page)
    block.evaluate("""el => {
        el.style.setProperty('--code-ratio', '0.56fr');
        el.style.setProperty('--panel-ratio', '0.44fr');
    }""")
    install_goal(block, cases[1])
    before = panel.evaluate(MEASURE, cases[1])
    panel.evaluate("el => el.firstElementChild.dataset.fontMarker = 'pending'")
    page.evaluate("""() => {
        window.actualFontEvents = 0;
        document.fonts.addEventListener('loadingdone', e => {
            if (e.fontfaces.some(face => face.family === 'AcceptanceMono')) window.actualFontEvents++;
        });
    }""")
    page.add_style_tag(content="""
        @font-face { font-family: AcceptanceMono;
            src: url('lib/katex/dist/fonts/KaTeX_Typewriter-Regular.woff2'); font-display: swap; }
        .info-panel .hl.lean { font-family: AcceptanceMono, monospace !important; }
    """)
    page.wait_for_function("document.fonts.status === 'loading'")
    assert len(held) == 1
    assert page.evaluate("window.actualFontEvents") == 0
    page.evaluate("""() => {
        window.fontGeometryOriginal = window.formatToHtml;
        window.formatToHtml = (format, annotations, width, measurer) => {
            document.querySelector('.slides > section.present .info-panel').geometryCall = {
                columns: Math.max(1, Math.floor(width / measurer.spaceWidth)),
                width, space: measurer.spaceWidth,
            };
            return window.fontGeometryOriginal(format, annotations, width, measurer);
        };
    }""")
    held[0].continue_()
    page.wait_for_function("window.actualFontEvents === 1 && document.fonts.check('24px AcceptanceMono')")
    expect(panel.locator('[data-font-marker]')).to_have_count(0)
    after = panel.evaluate(MEASURE, cases[1])
    page.evaluate("window.formatToHtml = window.fontGeometryOriginal; delete window.fontGeometryOriginal")
    assert abs(after["space"] - before["space"]) > 0.01
    assert_native_layout(after, cases[after["columns"]])
    assert after["text"] != before["text"]
    record(request, browser, {"beforeFont": before, "afterFont": after, "actualFontEvents": 1})


MEMORY_PROBE = """(() => {
    const original = WebAssembly.Instance;
    window.retentionProbe = {memories: [], unhandled: []};
    window.addEventListener('unhandledrejection', e => window.retentionProbe.unhandled.push(String(e.reason)));
    WebAssembly.Instance = new Proxy(original, {construct(target, args) {
        const instance = Reflect.construct(target, args);
        window.retentionProbe.memories.push(new WeakRef(instance.exports.memory));
        return instance;
    }});
})()"""


def test_repeated_formatting_and_reflow_retention(page, browser, server, site_dir, request):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.add_init_script(MEMORY_PROBE)
    open_demo(page, server)
    block, panel, _ = open_proof_panel(page)
    corpus = json.loads((site_dir / "native-corpus.json").read_text())
    measurements = page.evaluate("""cases => {
        const capacities = [], batchMilliseconds = [];
        for (let batch = 0; batch < 5; batch++) {
            const start = performance.now();
            for (let repeat = 0; repeat < 128; repeat++) {
                const c = cases[repeat % cases.length];
                const got = window.versoVirFormatSegments(c.format, c.width, c.indent);
                const expected = c.result.segments;
                if (got.length !== expected.length || got.some((s, i) =>
                    s.text !== expected[i].text || s.tags.length !== expected[i].tags.length ||
                    s.tags.some((tag, t) => typeof tag !== 'bigint' || tag !== BigInt(expected[i].tags[t])))) throw Error(c.name);
            }
            batchMilliseconds.push(performance.now() - start);
            capacities.push(window.retentionProbe.memories[0].deref().buffer.byteLength);
        }
        const counts = [];
        for (let repeat = 0; repeat < 64; repeat++) {
            const panel = document.querySelector('.slides > section.present .info-panel');
            renderRichFormat(panel, panel._richFormatSource);
            if (panel.querySelector('[style*="visibility: hidden"]')) throw Error('retained measurement probe');
            counts.push(panel.querySelectorAll('*').length);
        }
        return {capacities, batchMilliseconds, counts};
    }""", corpus)
    # Wasm capacity is an observation, not a formatting invariant.
    assert len(set(measurements["counts"])) == 1
    # Chromium GC is a separate diagnostic phase, not part of the timings above.
    if browser.browser_type.name == "chromium":
        cdp = page.context.new_cdp_session(page)
        cdp.send("HeapProfiler.collectGarbage")
        measurements["liveMemoryWrappersAfterGC"] = page.evaluate(
            "window.retentionProbe.memories.filter(ref => ref.deref()).length")
        assert measurements["liveMemoryWrappersAfterGC"] == 1
        cdp.detach()
    page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}))")
    assert page.evaluate("window.versoVir.status") == "active"
    page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide'))")
    assert page.evaluate("window.versoVir === undefined && window.versoVirFormatSegments === undefined")
    assert page.evaluate("window.retentionProbe.unhandled") == []
    assert errors == []
    record(request, browser, measurements)
