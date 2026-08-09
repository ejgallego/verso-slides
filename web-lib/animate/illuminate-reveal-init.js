// @ts-check

// Multi-animation reveal.js integration for VersoSlides.
// anim_core.js helpers (animFindSegment, animRenderSegFrame, etc.)
// are prepended by the Lean build via include_str concatenation.

(function () {
    /**
     * @typedef {{totalFrames: number, steps: StepInfo[], pauseSteps: StepInfo[], autoplay: boolean}} RevealPolicy
     * @typedef {({kind: "slideEntered", value: number} | {kind: "slideLeft"} | {kind: "fragmentShown", value: number} | {kind: "fragmentHidden", value: number})} RevealPolicyEvent
     * @typedef {({kind: "pause"} | {kind: "seek", value: number | string} | {kind: "playTo", fields: {frame: number | string, loopAfter: boolean}} | {kind: "loopAt", value: number | string})} RevealPolicyCommand
     * @typedef {{name?: string, plan: (policy: RevealPolicy, event: RevealPolicyEvent) => RevealPolicyCommand[]}} RevealPolicyPlanner
     * @typedef {{data: AnimData, container: HTMLElement, currentSeg: Segment | null, currentFrame: number, animId: number | null, pauseSteps: StepInfo[], policy: RevealPolicy, policyQueue: Promise<void>}} AnimationState
     * @typedef {Window & {__versoRevealPolicyBackend?: Promise<RevealPolicyPlanner>}} RevealPolicyWindow
     */

    var root = /** @type {RevealPolicyWindow} */ (window);
    /** @type {Promise<RevealPolicyPlanner> | null} */
    var policyBackend = root.__versoRevealPolicyBackend || null;

    /** @type {Object<string, AnimationState>} */
    var animations = {};

    /**
     * @param {{data: AnimData, container: HTMLElement, currentSeg: Segment | null, currentFrame: number}} state
     * @param {number} frame
     */
    function showFrame(state, frame) {
        frame = animClampFrame(frame, state.data.totalFrames);
        state.currentSeg = animRenderSegFrame(
            state.container,
            animFindSegment(state.data.segments, frame),
            state.currentSeg,
            frame - animFindSegment(state.data.segments, frame).sf,
        );
        state.currentFrame = frame;
    }

    var scripts = document.querySelectorAll("script[data-illuminate-anim]");
    for (var si = 0; si < scripts.length; si++) {
        var scriptEl = scripts[si];
        var containerId = scriptEl.getAttribute("data-illuminate-anim");
        if (!containerId) continue;
        var container = document.getElementById(containerId);
        if (!container) continue;
        /** @type {AnimData} */
        var data;
        try {
            data = JSON.parse(/** @type {string} */ (scriptEl.textContent));
        } catch (e) {
            continue;
        }
        if (!data || !data.segments || data.segments.length === 0) continue;

        var pauseSteps = data.steps.filter(function (s) {
            return s.pause;
        });
        var autoplay = container.getAttribute("data-illuminate-autoplay") === "true";
        /** @type {AnimationState} */
        var state = {
            data: data,
            container: container,
            currentSeg: /** @type {Segment | null} */ (null),
            currentFrame: 0,
            animId: /** @type {number | null} */ (null),
            pauseSteps: pauseSteps,
            policy: {
                totalFrames: data.totalFrames,
                steps: data.steps,
                pauseSteps: pauseSteps,
                autoplay: autoplay,
            },
            policyQueue: Promise.resolve(),
        };
        animations[containerId] = state;
        container.dataset.illuminatePolicyBackend = policyBackend ? "loading" : "javascript";

        // Show first frame
        showFrame(state, 0);

        // Fragment spans are emitted in the HTML at build time (not created dynamically),
        // so Reveal.js sees them during its initial scan. Nothing to create here.
    }

    /**
     * @param {{animId: number | null}} state
     */
    function stopAnim(state) {
        if (state.animId !== null) {
            cancelAnimationFrame(state.animId);
            state.animId = null;
        }
    }

    /**
     * @param {{data: AnimData, container: HTMLElement, currentSeg: Segment | null, currentFrame: number, animId: number | null}} state
     * @param {number} loopStart
     * @param {number} loopEnd
     */
    function startLoop(state, loopStart, loopEnd) {
        var loopLen = loopEnd - loopStart;
        if (loopLen <= 0) return;
        /** @type {number | null} */
        var startTime = null;
        /** @param {number} timestamp */
        function tick(timestamp) {
            if (startTime === null) startTime = timestamp;
            var frame = animComputeFrame(startTime, timestamp, state.data.fps, loopStart);
            var loop = animWrapLoop(frame, loopStart, loopEnd);
            showFrame(state, loop.wrapped);
            state.animId = requestAnimationFrame(tick);
        }
        state.animId = requestAnimationFrame(tick);
    }

    /**
     * @param {{data: AnimData, container: HTMLElement, currentSeg: Segment | null, currentFrame: number, animId: number | null}} state
     * @param {number} targetFrame
     * @param {(() => void)} [onComplete]
     */
    function animateTo(state, targetFrame, onComplete) {
        stopAnim(state);
        var startFrame = state.currentFrame;
        /** @type {number | null} */
        var startTime = null;
        var dir = targetFrame > startFrame ? 1 : -1;
        /** @param {number} timestamp */
        function tick(timestamp) {
            if (startTime === null) startTime = timestamp;
            var frame = animComputeFrame(startTime, timestamp, state.data.fps, startFrame);
            if (dir < 0) {
                frame = startFrame - (frame - startFrame);
            }
            if ((dir > 0 && frame >= targetFrame) || (dir < 0 && frame <= targetFrame)) {
                showFrame(state, targetFrame);
                state.animId = null;
                if (onComplete) onComplete();
                return;
            }
            showFrame(state, frame);
            state.animId = requestAnimationFrame(tick);
        }
        if (startFrame === targetFrame) {
            if (onComplete) onComplete();
        } else {
            state.animId = requestAnimationFrame(tick);
        }
    }

    /**
     * Finds the frame reached after advancing through pause step `index` and all
     * following non-pause steps.
     * @param {RevealPolicy} policy
     * @param {number} index
     * @returns {number | null}
     */
    function targetAfterPause(policy, index) {
        var current = policy.pauseSteps[index];
        if (!current) return null;
        var next = policy.pauseSteps[index + 1];
        if (next) return Math.max(next.frame - 1, current.frame);
        return Math.max(0, policy.totalFrames - 1);
    }

    /** @param {RevealPolicy} policy @param {number} frame */
    function stepLoopsAt(policy, frame) {
        var index = animFindCurrentStep(policy.steps, frame);
        return !!policy.steps[index]?.loop;
    }

    /**
     * JavaScript compatibility oracle for the compiler-neutral Lean policy.
     * It remains the default and the fallback when no VIR policy is configured.
     * @param {RevealPolicy} policy
     * @param {RevealPolicyEvent} event
     * @returns {RevealPolicyCommand[]}
     */
    function planPolicyInJavaScript(policy, event) {
        if (event.kind === "slideLeft") return [{ kind: "pause" }];
        if (event.kind === "slideEntered") {
            if (event.value > 0 && policy.pauseSteps.length > 0) {
                var visibleIndex = Math.min(event.value - 1, policy.pauseSteps.length - 1);
                var visibleStep = policy.pauseSteps[visibleIndex];
                if (visibleStep.loop) return [{ kind: "loopAt", value: visibleStep.frame }];
                var visibleTarget = targetAfterPause(policy, visibleIndex);
                return visibleTarget === null ? [] : [{ kind: "seek", value: visibleTarget }];
            }
            if (policy.autoplay) {
                var autoplayTarget =
                    policy.pauseSteps.length > 0
                        ? policy.pauseSteps[0].frame
                        : Math.max(0, policy.totalFrames - 1);
                return [
                    { kind: "seek", value: 0 },
                    { kind: "playTo", fields: { frame: autoplayTarget, loopAfter: false } },
                ];
            }
            return [{ kind: "seek", value: 0 }];
        }
        if (event.kind === "fragmentShown") {
            var shown = policy.pauseSteps[event.value];
            if (!shown) return [];
            if (shown.loop) {
                return [{ kind: "playTo", fields: { frame: shown.frame, loopAfter: true } }];
            }
            var shownTarget = targetAfterPause(policy, event.value);
            return shownTarget === null
                ? []
                : [
                      {
                          kind: "playTo",
                          fields: {
                              frame: shownTarget,
                              loopAfter: stepLoopsAt(policy, shownTarget),
                          },
                      },
                  ];
        }
        if (event.value === 0) {
            return [{ kind: "playTo", fields: { frame: 0, loopAfter: false } }];
        }
        var previous = policy.pauseSteps[event.value - 1];
        if (!previous) return [];
        if (previous.loop) return [{ kind: "loopAt", value: previous.frame }];
        var hiddenTarget = targetAfterPause(policy, event.value - 1);
        return hiddenTarget === null
            ? []
            : [{ kind: "playTo", fields: { frame: hiddenTarget, loopAfter: false } }];
    }

    /** @param {number | string} value @param {string} label */
    function commandFrame(value, label) {
        var frame = Number(value);
        if (!Number.isSafeInteger(frame) || frame < 0) {
            throw new Error("invalid " + label + " frame: " + String(value));
        }
        return frame;
    }

    /** @param {AnimationState} state @param {RevealPolicyCommand} command */
    function executePolicyCommand(state, command) {
        if (command.kind === "pause") {
            stopAnim(state);
        } else if (command.kind === "seek") {
            stopAnim(state);
            showFrame(state, commandFrame(command.value, "seek"));
        } else if (command.kind === "loopAt") {
            stopAnim(state);
            var loopFrame = commandFrame(command.value, "loopAt");
            var loopStep = animFindCurrentStep(state.data.steps, loopFrame);
            showFrame(state, loopFrame);
            startLoop(
                state,
                loopFrame,
                animFindStepEnd(state.data.steps, loopStep, state.data.totalFrames),
            );
        } else {
            var target = commandFrame(command.fields.frame, "playTo");
            animateTo(
                state,
                target,
                command.fields.loopAfter
                    ? function () {
                          var step = animFindCurrentStep(state.data.steps, target);
                          var loopStart = state.data.steps[step]?.frame ?? target;
                          startLoop(
                              state,
                              loopStart,
                              animFindStepEnd(state.data.steps, step, state.data.totalFrames),
                          );
                      }
                    : undefined,
            );
        }
    }

    /**
     * @param {AnimationState} state
     * @param {RevealPolicyCommand[]} commands
     */
    function executePolicyCommands(state, commands) {
        for (var i = 0; i < commands.length; i++) executePolicyCommand(state, commands[i]);
    }

    /** @param {AnimationState} state @param {RevealPolicyEvent} event */
    function dispatchPolicy(state, event) {
        if (!policyBackend) {
            executePolicyCommands(state, planPolicyInJavaScript(state.policy, event));
            return;
        }
        state.policyQueue = state.policyQueue
            .then(function () {
                return /** @type {Promise<RevealPolicyPlanner>} */ (policyBackend);
            })
            .then(function (planner) {
                executePolicyCommands(state, planner.plan(state.policy, event));
                state.container.dataset.illuminatePolicyBackend = planner.name || "external";
            })
            .catch(function (error) {
                policyBackend = null;
                state.container.dataset.illuminatePolicyBackend = "javascript-fallback";
                console.error("Verso Reveal VIR policy failed; using JavaScript", error);
                executePolicyCommands(state, planPolicyInJavaScript(state.policy, event));
            });
    }

    /**
     * Syncs an animation to the current fragment state on the slide.
     * When navigating backward, fragments are already visible, so the
     * animation should jump to the corresponding frame.
     * @param {AnimationState} st
     */
    function syncToFragmentState(st) {
        // Count how many of this animation's fragments are currently visible
        var parent = st.container.parentElement;
        if (!parent) return;
        var visibleCount = 0;
        var frags = parent.querySelectorAll(
            'span.fragment[data-illuminate-container="' + st.container.id + '"]',
        );
        for (var i = 0; i < frags.length; i++) {
            if (frags[i].classList.contains("visible")) visibleCount++;
        }
        dispatchPolicy(st, { kind: "slideEntered", value: visibleCount });
    }

    if (typeof Reveal !== "undefined") {
        // Sync animations when entering a slide (handles both forward and backward navigation)
        Reveal.on("slidechanged", function (event) {
            if (event.previousSlide) {
                var previous = event.previousSlide.querySelectorAll(".illuminate-anim");
                for (var pi = 0; pi < previous.length; pi++) {
                    var previousState = animations[/** @type {HTMLElement} */ (previous[pi]).id];
                    if (previousState) dispatchPolicy(previousState, { kind: "slideLeft" });
                }
            }
            var slide = event.currentSlide || Reveal.getCurrentSlide();
            if (!slide) return;
            var containers = slide.querySelectorAll(".illuminate-anim");
            for (var ci = 0; ci < containers.length; ci++) {
                var st = animations[containers[ci].id];
                if (st) syncToFragmentState(st);
            }
        });

        // Also trigger on initial load for the first slide
        Reveal.on("ready", function () {
            var slide = Reveal.getCurrentSlide();
            if (!slide) return;
            var containers = slide.querySelectorAll(".illuminate-anim");
            for (var ci = 0; ci < containers.length; ci++) {
                var st = animations[containers[ci].id];
                if (st) syncToFragmentState(st);
            }
        });

        // Helper: process a single animation fragment for fragmentshown
        /** @param {HTMLElement} frag */
        function handleFragShown(frag) {
            var cid = frag.dataset.illuminateContainer;
            if (!cid) return;
            var state = animations[cid];
            if (!state) return;
            var idx = parseInt(frag.dataset.illuminateStepIndex || "", 10);
            if (isNaN(idx) || idx >= state.pauseSteps.length) return;
            dispatchPolicy(state, { kind: "fragmentShown", value: idx });
        }

        // Helper: process a single animation fragment for fragmenthidden
        /** @param {HTMLElement} frag */
        function handleFragHidden(frag) {
            var cid = frag.dataset.illuminateContainer;
            if (!cid) return;
            var state = animations[cid];
            if (!state) return;
            var idx = parseInt(frag.dataset.illuminateStepIndex || "", 10);
            if (isNaN(idx) || idx >= state.pauseSteps.length) return;
            dispatchPolicy(state, { kind: "fragmentHidden", value: idx });
        }

        // Reveal.js may fire fragmentshown/hidden with e.fragment (one element)
        // or e.fragments (all elements at that index). Iterate all to find
        // animation fragments when multiple fragments share the same index.
        Reveal.on("fragmentshown", function (e) {
            var frags = e.fragments || [e.fragment];
            for (var fi = 0; fi < frags.length; fi++) {
                var frag = frags[fi];
                if (frag) handleFragShown(frag);
            }
        });
        Reveal.on("fragmenthidden", function (e) {
            var frags = e.fragments || [e.fragment];
            for (var fi = 0; fi < frags.length; fi++) {
                var frag = frags[fi];
                if (frag) handleFragHidden(frag);
            }
        });
    }
})();
