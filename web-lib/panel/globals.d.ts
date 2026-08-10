// Type declarations for external globals used by panel.js and pretty.js.

/** Reveal.js presentation API (global). */
declare var Reveal: {
    on(event: string, callback: (...args: any[]) => void): void;
    isReady(): boolean;
    getCurrentSlide(): HTMLElement | null;
    getRevealElement(): HTMLElement | null;
    getScale(): number;
    /** Returns the backdrop element for the given slide `<section>`, if any. */
    getSlideBackground(slide: Element): HTMLElement | null;
};

/**
 * tippy.js (global, loaded from lib/tippy.js). Invoked as a function with a
 * selector/element/list of elements, and also exposes static properties
 * (`setDefaultProps`, `hideAll`, …) copied onto the function object.
 */
declare var tippy: ((targets: unknown, props?: unknown) => unknown) & Record<string, unknown>;

/** marked.js Markdown parser (global, may not be loaded). */
declare var marked: { parse(text: string): string } | undefined;

interface VersoPrettyVirRuntime {
    call(name: string, ...args: any[]): any;
    callTimed?(name: string, ...args: any[]): VersoPrettyVirTimedCall;
}

interface VersoPrettyVirCallTimings {
    marshalMs: number;
    executeMs: number;
    decodeMs: number;
    hostMs: number;
    totalMs: number;
}

interface VersoPrettyVirTimedCall {
    value: any;
    timings: VersoPrettyVirCallTimings;
}

interface VersoPrettyVirBridge {
    enabled?: boolean;
    runtime?: VersoPrettyVirRuntime;
    jsonExportName?: string;
    formatExportName?: string;
    renderedExportName?: string;
    renderPlanExportName?: string;
    htmlExportName?: string;
    residentExportName?: string;
    residentRenderPlanExportName?: string;
    formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string;
    formatSegments?: (fmt: unknown, width: number, indent: number) => unknown;
    formatRendered?: (fmt: unknown, width: number, indent: number) => unknown;
    formatRenderPlan?: (
        fmt: unknown,
        annotations: unknown[],
        width: number,
        indent: number,
    ) => unknown;
    formatHtml?: (fmt: unknown, annotations: unknown[], width: number, indent: number) => string;
    formatRenderedById?: (formatId: number, width: number, indent: number) => unknown;
    formatRenderPlanById?: (formatId: number, width: number, indent: number) => unknown;
    formatJsonSegmentsJsonTimed?: (
        fmtJson: string,
        width: number,
        indent: number,
    ) => VersoPrettyVirTimedCall;
    formatSegmentsTimed?: (fmt: unknown, width: number, indent: number) => VersoPrettyVirTimedCall;
    formatRenderedTimed?: (fmt: unknown, width: number, indent: number) => VersoPrettyVirTimedCall;
    formatRenderPlanTimed?: (
        fmt: unknown,
        annotations: unknown[],
        width: number,
        indent: number,
    ) => VersoPrettyVirTimedCall;
    formatHtmlTimed?: (
        fmt: unknown,
        annotations: unknown[],
        width: number,
        indent: number,
    ) => VersoPrettyVirTimedCall;
    formatRenderedByIdTimed?: (
        formatId: number,
        width: number,
        indent: number,
    ) => VersoPrettyVirTimedCall;
    formatRenderPlanByIdTimed?: (
        formatId: number,
        width: number,
        indent: number,
    ) => VersoPrettyVirTimedCall;
    ready?: Promise<unknown>;
    status?: string;
    error?: unknown;
    warnings?: Record<string, boolean>;
}

interface VersoPrettyVirConfig {
    enabled?: boolean;
    runtimeUrl?: string;
    wasmUrl?: string;
    wasmDebugUrl?: string;
    debugWasm?: boolean;
    fetchCache?: RequestCache;
    irPackageUrl?: string;
    jsonExportName?: string;
    formatExportName?: string;
    renderedExportName?: string;
    renderPlanExportName?: string;
    htmlExportName?: string;
    residentExportName?: string;
    residentRenderPlanExportName?: string;
}

interface VersoPrettyNativeBridge {
    enabled?: boolean;
    status?: string;
    ready?: Promise<unknown>;
    error?: unknown;
    build?: unknown;
    formatSegments?: (fmtJson: unknown, width: number, indent: number, column: number) => Segment[];
    formatSegmentsTimed?: (
        fmtJson: unknown,
        width: number,
        indent: number,
        column: number,
    ) => {
        text: string;
        segments: Segment[];
        timings: PrettyTimings;
        memory?: Record<string, number>;
    };
    traceToSegments?: (trace: {
        text: string;
        events: Array<{ kind: number; text: string; value: bigint }>;
    }) => Segment[];
    warnings?: Record<string, boolean>;
}

interface VersoPrettyNativeConfig {
    enabled?: boolean;
    adapterUrl?: string;
    wasmUrl?: string;
    descriptorUrl?: string;
    buildUrl?: string;
    fetchCache?: RequestCache;
    maximumNodes?: number;
}

interface VersoPrettyLlvmBridge {
    enabled?: boolean;
    status?: string;
    ready?: Promise<unknown>;
    error?: unknown;
    manifest?: unknown;
    dispose?: () => void;
    formatSegments?: (fmtJson: unknown, width: number, indent: number, column: number) => Segment[];
    formatSegmentsTimed?: (
        fmtJson: unknown,
        width: number,
        indent: number,
        column: number,
    ) => {
        text: string;
        segments: Segment[];
        timings: PrettyTimings;
        memory?: Record<string, number>;
    };
    traceToSegments?: (trace: {
        text: string;
        events: Array<{ kind: number; text: string; value: bigint }>;
    }) => Segment[];
    warnings?: Record<string, boolean>;
}

interface VersoPrettyLlvmConfig {
    enabled?: boolean;
    adapterUrl?: string;
    manifestUrl?: string;
    maximumNodes?: number;
    maximumBytes?: number;
}

type VersoPrettyTimingDisplay =
    | "total"
    | "prepare"
    | "execute"
    | "marshal"
    | "decode"
    | "render"
    | "commit"
    | "host"
    | "wall"
    | "tracks";

interface VersoPrettyConfig {
    compare?: boolean;
    backend?: string;
    backends?: string[];
    experiment?: string;
    experiments?: PrettyExperimentDefinition[];
    columns?: number;
    workload?: number;
    controls?: boolean;
    timing?: VersoPrettyTimingDisplay;
    mode?: "matrix" | "custom";
    families?: Array<"js" | "vir" | "fir" | "llvm">;
    breadth?: "layout" | "semantic" | "html";
    virPanel?: boolean;
}

interface VersoVirPanelConfig {
    runtimeUrl?: string;
    wasmUrl?: string;
    irPackageSetUrl?: string;
}

interface VersoVirPanelCall {
    kind: "mount" | "unmount";
    contentId?: number;
    width?: number;
    timings: VersoPrettyVirCallTimings;
}

interface VersoVirPanelBridge {
    status: string;
    error?: unknown;
    runtime?: unknown;
    lastCall?: VersoPrettyVirTimedCall;
    calls: VersoVirPanelCall[];
    ready?: Promise<unknown>;
    mount?: (target: Element, contentId: number, width: number) => boolean;
    unmount?: (target: Element) => boolean;
}

interface Window {
    __versoPrettyConfig?: VersoPrettyConfig;
    __versoPrettyVir?: VersoPrettyVirBridge;
    __versoPrettyVirConfig?: VersoPrettyVirConfig;
    __versoPrettyNative?: VersoPrettyNativeBridge;
    __versoPrettyNativeConfig?: VersoPrettyNativeConfig;
    __versoPrettyLlvm?: VersoPrettyLlvmBridge;
    __versoPrettyLlvmConfig?: VersoPrettyLlvmConfig;
    __versoVirPanel?: VersoVirPanelBridge;
    __versoVirPanelConfig?: VersoVirPanelConfig;
}

/** pretty.js — render a format tree to HTML at a given pixel width (global). */
declare function formatToHtml(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
): string;

declare function formatToHtmlWithBackend(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
    backend: string,
    formatId?: number,
): string | null;

declare function formatToHtmlTimed(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
    backend: string,
    formatId?: number,
): {
    html: string | null;
    fragment: DocumentFragment | null;
    durationMs: number;
    timings: PrettyTimings;
};

declare function formatPrettyOutputTimed(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
    backend: string,
    formatId?: number,
): TimedPrettyResult;

declare function insertPrettyOutput(target: Element, output: TimedPrettyResult | null): boolean;
declare function insertPrettyOutputTimed(
    target: Element,
    output: TimedPrettyResult | null,
): boolean;

interface PrettyBackendDefinition {
    id: string;
    label: string;
    ready?: Promise<unknown>;
    status?: () => string;
    capabilities?: {
        runtime?: "javascript" | "vir" | "fir-native" | "llvm-emscripten";
        input?: "compact-tree" | "json-string" | "lean-format" | "resident-id" | "browser-format";
        output: "segments" | "text-events" | "render-plan" | "pretty-trace" | "text" | "html";
        width: "pixels" | "columns";
        materializer?: "html-string" | "dom-fragment";
        matrix?: {
            backend: "js" | "vir" | "fir" | "llvm";
            breadth: "layout" | "semantic" | "html";
            role?: "primary" | "variant";
        };
    };
    renderSegments?(
        fmtJson: any,
        annotations: Record<string, any>,
        pixelWidth: number,
        measurer: DOMMeasurer,
        formatId?: number,
    ): Array<{ text: string; tags: number[] }> | null;
    renderTimed?(
        fmtJson: any,
        annotations: Record<string, any>,
        pixelWidth: number,
        measurer: DOMMeasurer,
        formatId?: number,
    ): PrettyRenderResult;
}

interface PrettyExperimentDefinition {
    id: string;
    label: string;
    question: string;
    backends: string[];
    design?: "controlled" | "end-to-end" | "exploratory";
    variable?: string;
    controls?: string[];
    measures?: string;
    excludes?: string[];
    timing?: VersoPrettyTimingDisplay;
    primaryTiming?: VersoPrettyTimingDisplay;
    phaseKeys?: string[];
}

declare function registerPrettyBackend(backend: PrettyBackendDefinition): void;
declare function getPrettyBackends(): PrettyBackendDefinition[];
declare function getPrettyBackend(id: string): PrettyBackendDefinition | null;
declare function getPrettyMatrixBackends(
    family: "js" | "vir" | "fir" | "llvm",
    breadth: "layout" | "semantic" | "html",
): PrettyBackendDefinition[];
declare function getPrettyMatrixBackend(
    family: "js" | "vir" | "fir" | "llvm",
    breadth: "layout" | "semantic" | "html",
): PrettyBackendDefinition | null;
declare function createColumnMeasurer(columns: number): DOMMeasurer;
declare function compactFormatSourceLength(fmtJson: any): number;
declare function emptyPrettyTimings(): PrettyTimings;
declare function addPrettyTimings(target: PrettyTimings, source: PrettyTimings): PrettyTimings;

/** pretty.js — create a DOM-based measurer for pixel-accurate text width measurement (global). */
declare function createDOMMeasurer(panel: HTMLElement): DOMMeasurer;
