// Type declarations for external globals used by panel.js and pretty.js.

/** Reveal.js presentation API (global). */
declare var Reveal: {
    on(event: string, callback: (...args: any[]) => void): void;
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
    compare?: boolean;
    runtime?: VersoPrettyVirRuntime;
    exportName?: string;
    objectExportName?: string;
    formatJsonSegmentsJson?: (fmtJson: string, width: number, indent: number) => string;
    formatCompatSegments?: (fmt: unknown, width: number, indent: number) => unknown;
    ready?: Promise<unknown>;
    status?: string;
    error?: unknown;
    warned?: boolean;
}

interface VersoPrettyVirConfig {
    enabled?: boolean;
    compare?: boolean;
    runtimeUrl?: string;
    wasmUrl?: string;
    wasmDebugUrl?: string;
    debugWasm?: boolean;
    irPackageUrl?: string;
    exportName?: string;
    objectExportName?: string;
}

interface Window {
    __versoPrettyVir?: VersoPrettyVirBridge;
    __versoPrettyVirConfig?: VersoPrettyVirConfig;
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
    backend: "auto" | "js" | "vir" | "vir-object",
): string | null;

declare function formatToHtmlTimed(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
    backend: "auto" | "js" | "vir" | "vir-object",
): { html: string | null; durationMs: number };

/** pretty.js — create a DOM-based measurer for pixel-accurate text width measurement (global). */
declare function createDOMMeasurer(panel: HTMLElement): DOMMeasurer;
