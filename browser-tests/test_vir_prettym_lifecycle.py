"""Page-owned retry UX against the emitted bootstrap and real supplied runtime.

Only the first Wasm fetch is held/failed. Acquisition, validation, instantiation,
formatting and disposal still run through the published VIR loader.
"""
from playwright.sync_api import expect

from test_vir_prettym_site import open_demo, open_proof_panel


def observe(page, mode):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script("""(() => {
        const mode = MODE;
        const control = window.lifecycleProbe = {unhandled: [], wasmRequests: 0, aborted: 0};
        window.addEventListener('unhandledrejection', e => control.unhandled.push(String(e.reason)));
        const original = window.fetch;
        window.fetch = (url, init) => {
            if (!String(url).endsWith('/runtime.wasm') || ++control.wasmRequests !== 1)
                return original(url, init);
            if (mode === 'fail') return Promise.reject(new Error('test acquisition failure'));
            return new Promise((resolve, reject) => {
                let settled = false;
                const abort = () => { settled = true; control.aborted++; reject(init.signal.reason); };
                init.signal.addEventListener('abort', abort, {once: true});
                control.release = () => {
                    // A settled gate must not start an orphaned, already-aborted
                    // real fetch after the acquisition owner has released it.
                    if (settled) return;
                    settled = true;
                    init.signal.removeEventListener('abort', abort);
                    resolve(original(url, init));
                };
            });
        };
    })()""".replace("MODE", repr(mode)))
    return errors


def open_pending(page, server, mode="hold"):
    errors = observe(page, mode)
    page.goto(f"{server}/nested/deck/index.html")
    page.wait_for_function("window.Reveal?.isReady() === true && window.lifecycleProbe.wasmRequests === 1")
    return errors


def select_pending_goal(page):
    index = page.evaluate("""() => {
        const sections = [...document.querySelectorAll('.slides > section')];
        const index = sections.findIndex(s => s.querySelector('.code-with-panel .tactic'));
        Reveal.slide(index, 0, 0); return index;
    }""")
    assert index >= 0
    block = page.locator(".slides > section.present .code-with-panel", has=page.locator(".tactic")).first
    block.locator(".tactic:visible").first.click()
    panel = block.locator(".info-panel")
    expect(panel.locator(".vir-panel-status")).to_be_visible()
    assert block.evaluate("el => !!el._activeSource")
    return block, panel


def assert_current_goal(block, panel):
    expect(panel.locator(".reflowed").first).not_to_be_empty()
    assert panel.evaluate("el => el._richFormatSource === el.closest('.code-with-panel')._activeSource.querySelector(':scope > .tactic-state')")
    assert block.evaluate("el => el._activeSource.classList.contains('panel-focus')")
    expect(panel.locator(".vir-panel-status")).to_have_count(0)


def assert_no_unhandled(page, errors):
    # Drain a task after the last attempt settles, including its report observer.
    page.evaluate("() => new Promise(resolve => setTimeout(resolve, 0))")
    assert page.evaluate("window.lifecycleProbe?.unhandled || []") == []
    assert errors == []


def test_slow_creation_keeps_navigation_and_latest_selection_usable(page, server):
    errors = open_pending(page, server)
    expect(page.locator(".vir-formatter-status")).to_have_text("Loading Lean formatting…")
    block, panel = select_pending_goal(page)
    original = block.evaluate("el => el._activeSource.getAttribute('data-tactic-range')")
    block.locator(".tactic:visible").nth(1).click()
    assert block.evaluate("el => el._activeSource.getAttribute('data-tactic-range')") != original
    assert page.evaluate("window.versoVir === undefined && window.versoVirFormatSegments === undefined")
    page.evaluate("window.lifecycleProbe.release()")
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    assert_current_goal(block, panel)
    expect(page.locator(".vir-formatter-status")).to_have_count(0)
    assert_no_unhandled(page, errors)


def test_readiness_does_not_restore_a_cleared_selection(page, server):
    errors = open_pending(page, server)
    block, panel = select_pending_goal(page)
    page.evaluate("const h = Reveal.getIndices().h; Reveal.slide(h + 1, 0, -1); Reveal.slide(h, 0, -1)")
    assert block.evaluate("el => el._activeSource === null")
    expect(panel).to_be_empty()
    page.evaluate("window.lifecycleProbe.release()")
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    expect(panel).to_be_empty()
    assert_no_unhandled(page, errors)


def test_failure_has_explicit_retry_and_renders_current_document(page, server):
    errors = open_pending(page, server, "fail")
    page.wait_for_function("window.versoVirState === 'failed'")
    block, panel = select_pending_goal(page)
    expect(page.get_by_role("alert")).to_have_text("Lean formatting could not be initialized.")
    expect(panel.locator(".vir-panel-status")).to_contain_text("unavailable")
    page.get_by_role("button", name="Retry Lean formatting").click()
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    assert_current_goal(block, panel)
    assert page.evaluate("window.versoVirFormatSegments('retried', 80, 0)") == [{"text": "retried", "tags": []}]
    expect(page.get_by_role("alert")).to_have_count(0)
    assert_no_unhandled(page, errors)


def test_pending_retry_cancels_old_acquisition_without_stale_updates(page, server):
    errors = open_pending(page, server)
    block, panel = select_pending_goal(page)
    page.evaluate("window.firstAttempt = window.versoVirReady; window.versoVirRetry();")
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    assert page.evaluate("window.lifecycleProbe.aborted") == 1
    assert page.evaluate("async () => { try { await window.firstAttempt; return false; } catch (e) { return e.name === 'AbortError'; } }")
    # A late network completion does not revive the old attempt.
    page.evaluate("window.lifecycleProbe.release()")
    assert_current_goal(block, panel)
    expect(page.get_by_role("alert")).to_have_count(0)
    assert_no_unhandled(page, errors)


def test_ready_retry_disposes_old_instance_and_preserves_pagehide_ownership(page, server):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.add_init_script("window.lifecycleProbe = {unhandled: []}; window.addEventListener('unhandledrejection', e => window.lifecycleProbe.unhandled.push(String(e.reason))); ")
    open_demo(page, server)
    block, panel, _ = open_proof_panel(page)
    page.evaluate("window.oldProgram = window.versoVir; window.versoVirRetry();")
    assert page.evaluate("window.oldProgram.status") == "disposed"
    page.wait_for_function("window.versoVirState === 'ready'", timeout=30000)
    assert page.evaluate("window.oldProgram !== window.versoVir")
    assert_current_goal(block, panel)
    page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true}))")
    assert page.evaluate("window.versoVir.status") == "active"
    page.evaluate("window.currentProgram = window.versoVir; window.dispatchEvent(new PageTransitionEvent('pagehide'))")
    assert page.evaluate("window.currentProgram.status") == "disposed"
    assert page.evaluate("window.versoVir === undefined && window.versoVirFormatSegments === undefined")
    assert page.evaluate("window.versoVirState") == "disposed"
    assert_no_unhandled(page, errors)
