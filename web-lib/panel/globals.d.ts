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
    /** ID of the formatter used by the interactive panel. */
    backend?: string;
}

interface Window {
    __versoPrettyConfig?: VersoPrettyConfig;
}

interface PrettyBackendDefinition {
    id: string;
    label: string;
    status?: () => string;
    ready?: Promise<unknown>;
    renderSegments(
        fmtJson: any,
        annotations: Record<string, any>,
        pixelWidth: number,
        measurer: DOMMeasurer,
    ): Array<{ text: string; tags: number[] }> | null;
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

/** pretty.js — render a format tree to HTML at a given pixel width (global). */
declare function formatToHtml(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
): string;

/** pretty.js — create a DOM-based measurer for pixel-accurate text width measurement (global). */
declare function createDOMMeasurer(panel: HTMLElement): DOMMeasurer;

interface VersoVirRuntime {
    call(name: string, ...args: unknown[]): unknown;
}

interface VersoPanelRenderer {
    render(panel: HTMLElement, source: Element, target: Element): boolean;
    release?(panel: HTMLElement): void;
}

interface Window {
    versoVir?: VersoVirRuntime;
    versoVirReady?: Promise<VersoVirRuntime>;
    __versoPanelRenderer?: VersoPanelRenderer;
}
