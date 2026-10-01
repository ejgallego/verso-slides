"""V2 bounds qualification against the native production-wrapper corpus.

--site-dir contains fresh root/nested demos, native-corpus.json and
bounds-corpus.json. Successful results include complete native segments/tags.
"""
import json

from test_vir_prettym_site import open_demo


def test_v2_program_and_runtime_identity(site_dir):
    for route in ("", "nested/deck"):
        bundles = [json.loads(p.read_text()) for p in (site_dir / route).glob("lib/vir/*/bundle.json")]
        runtime = next(b for b in bundles if b["descriptor"]["kind"] == "runtime")
        program = next(b for b in bundles if b["descriptor"]["kind"] == "program")
        assert runtime["contentId"] == "832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d"
        assert program["contentId"] != "0a2c42819737c359f9a72e3bbe4e7fd890db6f96891be171c92fa095057d4ae2"
        assert program["descriptor"]["exports"] == [{
            "role": "formatSegments",
            "declaration": "VersoSlides.VirPrettyM.formatSegments",
            "interfaceId": "verso-slides-format-segments-hostabi-v2",
        }]


def test_production_bounds_same_native_wrapper_and_recovery(page, server, site_dir):
    open_demo(page, server)
    corpus = json.loads((site_dir / "bounds-corpus.json").read_text())
    assert len(corpus) == 29
    for case in corpus:
        # Test-only bypass, using finite, reviewed equality/one-over fixtures.
        # This checks the Lean guard independently of JS admission.
        raw = page.evaluate("""c => {
            const result = window.versoVir.call('formatSegments',
                compactFormatToStdFormatUnchecked(c.format), c.width, c.indent);
            return result.kind === 'ok' ? {segments: result.value} : {error: result.value};
        }""", case)
        assert raw == case["result"], f"raw {case['name']}"
        assert page.evaluate("window.versoVir.status") == "active"
        assert page.evaluate("window.versoVirFormatSegments('v', 0, 0)") == [{"text": "v", "tags": []}]

        admitted = page.evaluate("""c => {
            try { return {segments: window.versoVirFormatSegments(c.format, c.width, c.indent)}; }
            catch (error) {
                if (error.name !== 'PrettyFormatError') throw error;
                return {error: error.code};
            }
        }""", case)
        assert admitted == case["result"], f"adapter {case['name']}"
        assert page.evaluate("window.versoVir.status") == "active"
        assert page.evaluate("window.versoVirFormatSegments('v', 0, 0)") == [{"text": "v", "tags": []}]


def test_browser_small_admission_budgets_and_numeric_negatives(page, server):
    open_demo(page, server)
    checked = page.evaluate("""() => {
        const cases = [
            [[4, 'a', 'b'], {maxNodes: 3}, {maxNodes: 2}, 'inputNodes'],
            [[5, 'a'], {maxDepth: 2}, {maxDepth: 1}, 'inputDepth'],
            [[4, 'é', 'é'], {maxInputBytes: 4}, {maxInputBytes: 3}, 'inputBytes'],
            ['😀', {maxTextBytes: 4}, {maxTextBytes: 3}, 'textBytes'],
            ['\\n\\n', {maxHardLines: 2}, {maxHardLines: 1}, 'hardLines'],
            [[3, 2, [3, 2, 1]], {maxIndent: 4}, {maxIndent: 3}, 'indentation'],
        ];
        let checked = 0;
        const recover = () => {
            const result = window.versoVirFormatSegments('v', 0, 0);
            if (result[0].text !== 'v' || window.versoVir.status !== 'active') throw Error('no recovery');
        };
        for (const [format, equal, over, code] of cases) {
            compactFormatToStdFormat(format, 0, {...VIR_FORMAT_LIMITS, ...equal});
            try { compactFormatToStdFormat(format, 0, {...VIR_FORMAT_LIMITS, ...over}); throw Error('accepted'); }
            catch (error) { if (error.code !== code) throw error; }
            recover(); checked++;
        }
        for (const format of [[3, 1.5, 'x'], [3, '1e3', 'x'], [3, Infinity, 'x'],
                [7, Number.MAX_SAFE_INTEGER + 1, 'x'], [7, '01', 'x'], [2, 'false'], [4, 'x']]) {
            try { window.versoVirFormatSegments(format, 4, 0); throw Error('accepted'); }
            catch (error) { if (error.code !== 'invalidInput') throw error; }
            recover(); checked++;
        }
        return checked;
    }""")
    assert checked == 13
