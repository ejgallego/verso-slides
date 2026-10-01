"""Mandatory VIR and shared DOM presentation, using emitted assets/native oracle."""
import json

from playwright.sync_api import expect

from test_vir_prettym_site import open_demo, open_proof_panel


def test_published_formatter_has_one_mandatory_path(site_dir):
    for route in ("", "nested/deck"):
        root = site_dir / route
        pretty = (root / "lib/pretty.js").read_text()
        assert "program.call(\"formatSegments\"" in pretty
        for old in ("function deserializeFormat", "function spaceUptoLine", "function be("):
            assert old not in pretty
        assert not (root / "vir-bootstrap.js").exists()
        html = (root / "index.html").read_text()
        assert html.count("window.__versoVirResourceUrls = ") == 1
        assert "__versoVirExpectedExports" not in html
        assert len(list(root.glob("lib/vir/*/bundle.json"))) == 2


def test_complete_native_segments_tags_classes_and_bindings_in_dom(page, server, site_dir):
    open_demo(page, server)
    corpus = json.loads((site_dir / "native-corpus.json").read_text())
    actual = page.evaluate("""cases => cases.map(c => {
        const direct = window.versoVir.call("formatSegments", compactFormatToStdFormat(c.format), c.width, c.indent);
        const segments = window.versoVirFormatSegments(c.format, c.width, c.indent);
        const annotations = {'7': {cssClass: 'const', binding: 'outer'},
            '8': {cssClass: 'var', binding: 'inner'}};
        const template = document.createElement('template');
        template.innerHTML = formatToHtml(c.format, annotations, c.width * 10, {spaceWidth: 10});
        return {segments, direct, isArray: Array.isArray(direct), text: template.content.textContent,
            tagged: [...template.content.querySelectorAll('[data-format-tags]')].map(el => ({
                text: el.textContent, tags: el.dataset.formatTags.split(' '),
                classes: [...el.classList], binding: el.getAttribute('data-binding'),
            }))};
    })""", corpus)
    for case, dom in zip(corpus, actual):
        expected = case["result"]["segments"]
        assert dom["isArray"] is True, case["name"]
        assert dom["direct"] == expected, case["name"]
        assert dom["segments"] == expected, case["name"]
        assert dom["text"] == "".join(s["text"] for s in expected), case["name"]
        tagged = []
        for s in expected:
            if not s["tags"]:
                continue
            annotation = next((t for t in reversed(s["tags"]) if t in ("7", "8")), None)
            tagged.append({**s, "classes": ["var" if annotation == "8" else "const", "token"] if annotation else [],
                "binding": "inner" if annotation == "8" else "outer" if annotation else None})
        assert dom["tagged"] == tagged, case["name"]


def test_annotation_escaping_and_exact_decimal_tags(page, server):
    open_demo(page, server)
    result = page.evaluate("""() => {
        const binding = 'b"\\\\[x]&<';
        const annotations = {'9007199254740993': {cssClass: 'var" onclick="evil', binding}};
        const template = document.createElement('template');
        const fmt = [7, '7', [7, '9007199254740993', '<&"\\n😀']];
        template.innerHTML = formatToHtml(fmt, annotations, 800, {spaceWidth: 10});
        const span = template.content.querySelector('[data-format-tags]');
        return {text: template.content.textContent, tags: span.dataset.formatTags.split(' '),
            binding: span.getAttribute('data-binding'), css: span.getAttribute('class'),
            unsafe: template.content.querySelectorAll('script,img,[onclick],[data-evil]').length,
            selectable: template.content.querySelector(bindingSelector(binding)) === span};
    }""")
    assert result == {"text": '<&"\n😀', "tags": ["7", "9007199254740993"],
        "binding": 'b"\\[x]&<', "css": 'var" onclick="evil token', "unsafe": 0, "selectable": True}


def set_goal(block, format_value, binding):
    block.evaluate("""(block, input) => {
        const tactic = block.querySelector('.tactic');
        const source = tactic.querySelector(':scope > .tactic-state');
        source.innerHTML = '<span>OLD STATIC LAYOUT</span>';
        source.setAttribute('data-rich-format', JSON.stringify([{
            hypotheses: [], goalPrefix: '⊢ ', ppConclusion: {
                fmt: input.format, annotations: {'7': {cssClass: 'var', binding: input.binding}},
            },
        }]));
        tactic.querySelector('.token').setAttribute('data-binding', input.binding);
        tactic.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    }""", {"format": format_value, "binding": binding})


def test_shared_goal_binding_interaction_uses_escaped_selector(page, server):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    open_demo(page, server)
    block, panel, _ = open_proof_panel(page)
    binding = 'binding"\\[x]&<='
    set_goal(block, [7, "7", 'x<&"'], binding)
    token = panel.locator(".reflowed .token").first
    expect(token).to_have_text('x<&"')
    expect(token).to_have_attribute("data-format-tags", "7")
    assert token.get_attribute("data-binding") == binding
    token.dispatch_event("mouseover")
    expect(token).to_have_class("var token binding-hl")
    assert block.locator("code .token.binding-hl").count() >= 1
    token.dispatch_event("mouseout")
    expect(block.locator(".binding-hl")).to_have_count(0)
    assert errors == []


def test_rejected_format_is_visible_without_static_layout_substitution_or_probe_retention(page, server):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    open_demo(page, server)
    block, panel, _ = open_proof_panel(page)
    page.evaluate("window.originalProgram = window.versoVir")
    set_goal(block, [3, 1.5, "invalid"], "bad")
    expect(panel.get_by_role("alert")).to_have_text("This Lean expression could not be formatted.")
    assert "OLD STATIC LAYOUT" not in panel.inner_text()
    expect(panel.locator('[style*="visibility: hidden"]')).to_have_count(0)
    assert page.evaluate("window.versoVir === window.originalProgram && window.versoVir.status === 'active'")
    set_goal(block, [7, "7", "recovered"], "good")
    expect(panel.locator(".reflowed .token")).to_have_text("recovered")
    expect(panel.get_by_role("alert")).to_have_count(0)
    expect(panel.locator('[style*="visibility: hidden"]')).to_have_count(0)
    assert errors == []


def test_panel_font_metric_change_reflows_current_format(page, server):
    open_demo(page, server)
    _, panel, _ = open_proof_panel(page)
    panel.evaluate("el => { el.firstElementChild.dataset.fontMarker = 'old'; el.style.fontSize = '0.8em'; }")
    # This is a controlled FontFaceSet notification, not qualification of an
    # actual delayed font download. Real acquisition/font geometry is a later gate.
    page.evaluate("document.fonts.dispatchEvent(new Event('loadingdone'))")
    expect(panel.locator('[data-font-marker]')).to_have_count(0)
    expect(panel.locator('.reflowed').first).not_to_be_empty()
    expect(panel.locator('[style*="visibility: hidden"]')).to_have_count(0)
