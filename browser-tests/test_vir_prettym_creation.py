"""Published bundle checks and document termination during actual creation."""
import hashlib
import json

RUNTIME = "832ab095ad79df0f10f538bcf71272731bb74b90df44f965dac2f086c222897d"
PROGRAM = "6533441116b4390058891c6045874e2400e99cc72719f92f420c606c7215f995"


def test_exact_pair_published_bytes(site_dir):
    for route in ("", "nested/deck"):
        root = site_dir / route
        manifests = [json.loads(p.read_text()) for p in root.glob("lib/vir/*/bundle.json")]
        assert {m["contentId"] for m in manifests} == {RUNTIME, PROGRAM}
        runtime = next(m for m in manifests if m["contentId"] == RUNTIME)
        assert runtime["descriptor"]["compatibility"] == {
            "leanRevision": "293d5d0c0c3f3dded4688b3ccd6a33939ac5102b", "virVersion": 1,
        }
        for info in runtime["descriptor"]["files"]:
            payload = (root / "lib/vir" / RUNTIME / info["path"]).read_bytes()
            assert len(payload) == info["byteLength"]
            assert hashlib.sha256(payload).hexdigest() == info["sha256"]
        assert hashlib.sha256((root / "lib/vir" / RUNTIME / "runtime.js").read_bytes()).hexdigest() == "b9fa28797af2787b4bae53a4d4a6a440b718512b54553717c65630b239b5829a"
        assert hashlib.sha256((root / "lib/vir" / RUNTIME / "runtime.wasm").read_bytes()).hexdigest() == "e74e7f8e663537a4f0035c0edf594fbea9699f40b4b683ffe563922b4f453ec4"


def test_published_bootstrap_pagehide_during_actual_creation_has_no_facade(page, server):
    page.add_init_script("""(() => {
        if (sessionStorage.getItem('strict-creation-aborted')) return;
        const original = WebAssembly.Instance, clearOriginal = Set.prototype.clear;
        let once = false;
        window.bootstrapCleanups = 0;
        Set.prototype.clear = function () {
            if (new Error().stack.includes('releaseLiveCallbacks')) window.bootstrapCleanups++;
            return clearOriginal.call(this);
        };
        WebAssembly.Instance = new Proxy(original, {construct(target, args) {
            const instance = Reflect.construct(target, args);
            if (!once) {
                once = true;
                sessionStorage.setItem('strict-creation-aborted', 'yes');
                window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: false}));
            }
            return instance;
        }});
    })();""")
    page.goto(f"{server}/nested/deck/index.html")
    page.wait_for_function("window.versoVirReady !== undefined")
    assert page.evaluate("""async () => {
        try { await window.versoVirReady; return {handedOff: true}; }
        catch (error) { return {
            name: error.name, cleanups: window.bootstrapCleanups,
            facade: window.versoVir !== undefined || window.versoVirFormatSegments !== undefined,
        }; }
    }""") == {"name": "AbortError", "cleanups": 1, "facade": False}
    assert page.locator('[role="alert"]').count() == 0
    page.reload()
    page.wait_for_function("window.versoVir !== undefined", timeout=30000)
    assert page.evaluate("window.versoVirFormatSegments('fresh page', 0, 0)") == [{"text": "fresh page", "tags": []}]
