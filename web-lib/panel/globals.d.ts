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
}

interface VersoPrettyVirBridge {
    enabled?: boolean;
    runtime?: VersoPrettyVirRuntime;
    jsonExportName?: string;
    formatExportName?: string;
    formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string;
    formatSegments?: (fmt: unknown, width: number, indent: number) => unknown;
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

interface VersoPrettyConfig {
    compare?: boolean;
    backend?: string;
    backends?: string[];
    columns?: number;
    controls?: boolean;
}

interface Window {
    __versoPrettyConfig?: VersoPrettyConfig;
    __versoPrettyVir?: VersoPrettyVirBridge;
    __versoPrettyVirConfig?: VersoPrettyVirConfig;
    __versoPrettyNative?: VersoPrettyNativeBridge;
    __versoPrettyNativeConfig?: VersoPrettyNativeConfig;
    __versoPrettyLlvm?: VersoPrettyLlvmBridge;
    __versoPrettyLlvmConfig?: VersoPrettyLlvmConfig;
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
): string | null;

declare function formatToHtmlTimed(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
    backend: string,
): { html: string | null; durationMs: number; timings: PrettyTimings };

interface PrettyBackendDefinition {
    id: string;
    label: string;
    ready?: Promise<unknown>;
    status?: () => string;
    capabilities?: {
        output: "segments" | "text";
        width: "pixels" | "columns";
    };
    renderSegments?(
        fmtJson: any,
        annotations: Record<string, any>,
        pixelWidth: number,
        measurer: DOMMeasurer,
    ): Array<{ text: string; tags: number[] }> | null;
    renderTimed?(
        fmtJson: any,
        annotations: Record<string, any>,
        pixelWidth: number,
        measurer: DOMMeasurer,
    ): PrettySegmentResult;
}

declare function registerPrettyBackend(backend: PrettyBackendDefinition): void;
declare function getPrettyBackends(): PrettyBackendDefinition[];
declare function getPrettyBackend(id: string): PrettyBackendDefinition | null;
declare function createColumnMeasurer(columns: number): DOMMeasurer;

/** pretty.js — create a DOM-based measurer for pixel-accurate text width measurement (global). */
declare function createDOMMeasurer(panel: HTMLElement): DOMMeasurer;
