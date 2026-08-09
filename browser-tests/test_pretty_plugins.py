"""Browser tests for the public pretty-printer backend registry."""

from playwright.sync_api import Page


def test_builtin_backend_is_registered(code_url: str, page: Page):
    page.goto(code_url)

    assert page.evaluate("getPrettyBackends().map(backend => backend.id)") == ["js"]
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
