"""Tests for user-bundled modules and the Reveal-ready browser API."""


class TestRuntimeModules:
    def test_module_tag_is_emitted(self, markup_doc):
        script = markup_doc.find(
            "script", attrs={"type": "module", "src": "js/ready-probe.mjs"}
        )
        assert script is not None

    def test_module_asset_is_written(self, site_dir):
        module = site_dir / "markup" / "js" / "ready-probe.mjs"
        assert module.exists()
        assert "await slides.ready" in module.read_text()

    def test_module_observes_initialized_reveal(self, markup_url, page):
        page.goto(f"{markup_url}/index.html")
        page.wait_for_function(
            "() => document.documentElement.dataset.versoSlidesModule === 'ready'"
        )
        api = page.evaluate(
            """() => ({
                hasReadyPromise: window.VersoSlides.ready instanceof Promise,
                sameReveal: window.VersoSlides.reveal === window.Reveal,
                revealReady: window.VersoSlides.reveal.isReady()
            })"""
        )
        assert api == {
            "hasReadyPromise": True,
            "sameReveal": True,
            "revealReady": True,
        }
