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

/** pretty.js — render a format tree to HTML at a given pixel width (global). */
declare function formatToHtml(
    fmtJson: any,
    annotations: Record<string, any>,
    pixelWidth: number,
    measurer: DOMMeasurer,
): string;

/** pretty.js — measure panel widths and monospace columns in CSS pixels (global). */
declare function createDOMMeasurer(panel: HTMLElement): DOMMeasurer;

declare function renderRichFormat(container: HTMLElement, source: Element): void;
declare function showFormattingStatus(container: HTMLElement): void;
declare function showFormattingFailure(container: HTMLElement, error: unknown): void;
declare function formatterIsReady(): boolean;
declare function bindingSelector(binding: string): string;

interface VersoVirProgram {
    readonly status: "active" | "failed" | "disposed";
    call(role: string, ...args: unknown[]): unknown;
    dispose(): void;
}

interface PrettySegment {
    text: string;
    tags: string[];
}

type PrettyFormatResult =
    | { kind: "ok"; value: PrettySegment[] }
    | { kind: "error"; value: string };

interface Window {
    /** Independent, reviewed existing VIR interface representation; embedded at build time. */
    __versoVirExpectedExports: Readonly<Record<string, {
        declaration: string;
        interfaceId: string;
        signature: { args: unknown[]; result: unknown; effect: "pure" };
    }>>;
    __versoVirResourceUrls: {
        runtimeModule: string;
        runtimeManifest: string;
        programManifest: string;
    };
    versoVir?: VersoVirProgram;
    versoVirReady?: Promise<VersoVirProgram>;
    /** State of the current page-owned creation attempt. */
    versoVirState?: "loading" | "ready" | "failed" | "disposed";
    /** Create a fresh attempt; no formatting calls are replayed. */
    versoVirRetry: () => Promise<VersoVirProgram>;
    /** Slides v2 facade: bounded compact input, typed segments, recoverable errors. */
    versoVirFormatSegments?: (format: unknown, width: number, indent: number) => PrettySegment[];
}
