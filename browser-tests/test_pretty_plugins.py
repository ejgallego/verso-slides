"""Browser tests for the public pretty-printer backend registry."""

from playwright.sync_api import Page
from conftest import goto_slide_by_title


def test_builtin_backend_is_registered(code_url: str, page: Page):
    page.goto(code_url)

    assert page.evaluate("getPrettyBackends().map(backend => backend.id)") == ["js", "fixture"]
    assert page.evaluate("getPrettyBackends() !== getPrettyBackends()")


def test_plugin_backend_can_register_render_and_replace(code_url: str, page: Page):
    page.goto(code_url)

    result = page.evaluate(
        """() => {
            const measurer = {
                measure: text => text.length,
                spaceWidth: 1,
                measureElWidth: () => 80,
                cleanup: () => {},
            };
            registerPrettyBackend({
                id: "fixture",
                label: "Fixture A",
                status: () => "ready",
                renderSegments: () => [{ text: "first", tags: [] }],
            });
            const first = formatToHtmlWithBackend(null, {}, 80, measurer, "fixture");
            registerPrettyBackend({
                id: "fixture",
                label: "Fixture B",
                status: () => "ready",
                renderSegments: () => [{ text: "<second>", tags: [] }],
            });
            return {
                first,
                second: formatToHtmlWithBackend(null, {}, 80, measurer, "fixture"),
                ids: getPrettyBackends().map(backend => backend.id),
                label: getPrettyBackend("fixture").label,
                missing: formatToHtmlWithBackend(null, {}, 80, measurer, "missing"),
            };
        }"""
    )

    assert result == {
        "first": "first",
        "second": "&lt;second&gt;",
        "ids": ["js", "fixture"],
        "label": "Fixture B",
        "missing": None,
    }


def test_unready_backend_does_not_fall_back(code_url: str, page: Page):
    page.goto(code_url)

    result = page.evaluate(
        """() => {
            registerPrettyBackend({
                id: "loading",
                label: "Loading",
                status: () => "loading",
                renderSegments: () => [{ text: "must not render", tags: [] }],
            });
            const measurer = {
                measure: text => text.length,
                spaceWidth: 1,
                measureElWidth: () => 80,
                cleanup: () => {},
            };
            return formatToHtmlWithBackend(null, {}, 80, measurer, "loading");
        }"""
    )

    assert result is None


def test_timed_backend_result_uses_generic_phase_details(code_url: str, page: Page):
    page.goto(code_url)

    result = page.evaluate(
        """() => {
            const measurer = createColumnMeasurer(40);
            return formatToHtmlTimed(null, {}, 40, measurer, "fixture");
        }"""
    )

    assert result["html"] == "fixture output"
    assert result["timings"]["marshalMs"] == 1
    assert result["timings"]["executeMs"] == 2
    assert result["timings"]["decodeMs"] == 3
    assert result["timings"]["details"] == [
        {"label": "Fixture input", "valueMs": 0.75, "phase": "marshal"},
        {"label": "Fixture engine", "valueMs": 1.5, "phase": "execute"},
    ]


def test_comparison_controls_and_phase_tracks(code_url: str, page: Page):
    page.add_init_script(
        """window.__versoPrettyConfig = {
            compare: true,
            backends: ["js", "fixture"],
            controls: true,
            timing: "tracks",
            columns: 40,
        };"""
    )

    proof = goto_slide_by_title(page, code_url, "Proof")
    block = proof.locator(".code-with-panel").first
    block.locator(".tactic").first.click()

    panes = block.locator(".pretty-compare-pane")
    assert panes.count() == 2
    assert panes.nth(0).locator(".pretty-compare-label").inner_text() == "JavaScript"
    assert panes.nth(1).locator(".pretty-compare-label").inner_text() == "Fixture"
    assert "fixture output" in panes.nth(1).locator(".pretty-compare-body").inner_text()

    fixture_time = panes.nth(1).locator(".pretty-compare-time")
    assert fixture_time.locator(".pretty-timing-tracks-total").count() == 1
    assert fixture_time.locator(".pretty-timing-track").count() == 4
    tooltip = fixture_time.get_attribute("title") or ""
    assert "Fixture input:" in tooltip
    assert "Fixture engine:" in tooltip
    assert "VIR" not in tooltip

    controls = page.locator("details.pretty-controls")
    assert controls.count() == 1
    assert controls.locator("summary").inner_text() == "Formatters 2/2"


def test_primary_timing_value_is_configurable(code_url: str, page: Page):
    page.add_init_script(
        """window.__versoPrettyConfig = {
            compare: true,
            backends: ["fixture"],
            timing: "execute",
        };"""
    )

    proof = goto_slide_by_title(page, code_url, "Proof")
    block = proof.locator(".code-with-panel").first
    block.locator(".tactic").first.click()

    timing = block.locator(".pretty-compare-time")
    assert timing.get_attribute("data-timing-display") == "execute"
    assert "Execute" in timing.inner_text()
