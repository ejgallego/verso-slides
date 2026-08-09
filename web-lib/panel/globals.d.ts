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

interface VersoPrettyConfig {
    /** IDs included in comparison mode, in registry order. */
    backends?: string[];
    /** Whether panels show all selected backends side by side. */
    compare?: boolean;
    /** Whether the interactive formatter options control is visible. */
    controls?: boolean;
    /** Deterministic character-column budget used for comparison. */
    columns?: number;
    /** ID of the formatter used outside comparison mode. */
    backend?: string;
    /** Value shown in each comparison pane's primary timing label. */
    timing?: VersoPrettyTimingDisplay;
}

type VersoPrettyTimingDisplay =
    | "total"
    | "execute"
    | "marshal"
    | "decode"
    | "render"
    | "wall"
    | "tracks";

interface Window {
    __versoPrettyConfig?: VersoPrettyConfig;
}

interface PrettyBackendDefinition {
    id: string;
    label: string;
    capabilities?: { output: string; width: string };
    status?: () => string;
    ready?: Promise<unknown>;
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

declare function formatToHtmlWithBackend(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
    backendId: string,
): string | null;

declare function emptyPrettyTimings(): PrettyTimings;
declare function createColumnMeasurer(columns: number): DOMMeasurer;
declare function formatToHtmlTimed(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
    backendId: string,
): { html: string | null; durationMs: number; timings: PrettyTimings };

/** pretty.js — render a format tree to HTML at a given pixel width (global). */
declare function formatToHtml(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
): string;

/** pretty.js — create a DOM-based measurer for pixel-accurate text width measurement (global). */
declare function createDOMMeasurer(panel: HTMLElement): DOMMeasurer;
