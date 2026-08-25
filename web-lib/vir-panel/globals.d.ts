interface VirRuntime {
    call(name: string, ...args: unknown[]): unknown;
}

interface VersoVirPanelRuntimeConfig {
    runtimeUrl?: string;
    wasmUrl?: string;
    irPackageSetUrl?: string;
    irPackageUrl?: string;
    wasmDebugUrl?: string;
    debugWasm?: boolean;
    fetchCache?: RequestCache;
}

interface VersoVirPanelRuntimeBridge {
    status: "loading" | "ready" | "failed";
    ready?: Promise<VirRuntime | null>;
    runtime?: VirRuntime;
    error?: unknown;
    assets?: string[];
}

interface VersoVirPanelBridge {
    status: "loading" | "ready" | "error";
    ready?: Promise<VersoVirPanelBridge>;
    runtime?: VirRuntime;
    error?: unknown;
    mount?: (target: Element, contentId: number, widths: number[], measureOnly: boolean) => boolean;
    unmount?: (target: Element) => boolean;
}

interface VirPanelDOMMeasurer {
    measure(text: string): number;
    spaceWidth: number;
    measureElWidth(element: Element): number;
    cleanup(): void;
}

declare function createDOMMeasurer(panel: HTMLElement): VirPanelDOMMeasurer;

interface Window {
    __versoVirPanelConfig?: VersoVirPanelRuntimeConfig;
    __versoVirPanelRuntime?: VersoVirPanelRuntimeBridge;
    __versoVirPanel?: VersoVirPanelBridge;
    __versoPanelRenderer?: VersoPanelRenderer;
}

interface VersoPanelRenderer {
    render(panel: HTMLElement, source: Element, target: Element): boolean;
    release?(panel: HTMLElement): void;
}
