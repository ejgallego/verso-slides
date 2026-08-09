interface StepInfo {
    frame: number;
    pause: boolean;
    loop: boolean;
}

interface ParamBinding {
    e: number;
    a: string;
}

interface Segment {
    sf: number;
    fc: number;
    sync: string;
    pmap: ParamBinding[];
    params: string[][];
    _elems?: Element[];
}

interface AnimData {
    fps: number;
    totalFrames: number;
    segments: Segment[];
    steps: StepInfo[];
}

interface LoopResult {
    wrapped: number;
    didCycle: boolean;
}

interface IlluminateRevealEvent {
    fragment?: HTMLElement;
    fragments?: HTMLElement[];
    previousSlide?: HTMLElement;
    currentSlide?: HTMLElement;
}

declare var Reveal: {
    on(type: string, callback: (event: IlluminateRevealEvent) => void): void;
    getCurrentSlide(): HTMLElement | null;
};

declare var animFindSegment: (segments: Segment[], frame: number) => Segment;
declare var animFindCurrentStep: (steps: StepInfo[], frame: number) => number;
declare var animClampFrame: (frame: number, totalFrames: number) => number;
declare var animComputeFrame: (
    startTime: number,
    timestamp: number,
    fps: number,
    pauseFrame: number,
) => number;
declare var animFindStepEnd: (steps: StepInfo[], stepIndex: number, totalFrames: number) => number;
declare var animWrapLoop: (frame: number, stepStart: number, stepEnd: number) => LoopResult;
declare var animRenderSegFrame: (
    container: HTMLElement,
    segment: Segment,
    currentSegment: Segment | null,
    localFrame: number,
) => Segment;
