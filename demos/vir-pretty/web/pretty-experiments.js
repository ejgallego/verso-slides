// @ts-check
/* Named comparison questions for the standalone pretty-printer demo. */
(function () {
    "use strict";

    /**
     * @typedef {{
     *   id: string,
     *   label: string,
     *   question: string,
     *   backends: string[],
     *   design: "controlled" | "end-to-end" | "exploratory",
     *   variable: string,
     *   controls: string[],
     *   measures: string
     * }} DemoExperiment
     * @typedef {{ experiment?: string, experiments?: DemoExperiment[] }} DemoPrettyConfig
     */
    var root = /** @type {Window & { __versoPrettyConfig?: DemoPrettyConfig }} */ (window);
    var config = root.__versoPrettyConfig || (root.__versoPrettyConfig = {});
    config.experiments = [
        {
            id: "implementations",
            label: "End-to-end implementations",
            question:
                "How do the complete JS, VIR, FIR-native, and LLVM paths compare from the shared compact Format input to panel HTML?",
            backends: ["js", "vir-format", "native", "llvm"],
            design: "end-to-end",
            variable: "Implementation, compiler/runtime, and browser adapter path",
            controls: [
                "compact Format source",
                "annotations",
                "column budget",
                "final HTML semantics",
            ],
            measures:
                "Product-level latency and memory. Phase timings locate costs; they do not isolate one ABI.",
        },
        {
            id: "vir-transport",
            label: "VIR input transport",
            question:
                "What changes when VIR receives JSON text versus the typed Lean Format object ABI, with segment output held fixed?",
            backends: ["vir", "vir-format"],
            design: "controlled",
            variable: "Input transport: JSON text ↔ typed Lean Format",
            controls: ["VIR runtime", "prettyM logic", "segment output", "column budget"],
            measures: "Incremental cost of serializing, parsing, and reconstructing the input.",
        },
        {
            id: "vir-output",
            label: "VIR output boundary",
            question:
                "What changes when VIR returns flat text/style events instead of copied tagged segments, with typed input held fixed?",
            backends: ["vir-format", "vir-flat"],
            design: "controlled",
            variable: "Output representation: tagged segments ↔ text + style events",
            controls: ["typed Lean Format input", "VIR runtime", "prettyM logic", "column budget"],
            measures:
                "Incremental execute, decode, payload, and total cost of the output boundary.",
        },
        {
            id: "vir-residency",
            label: "VIR input residency",
            question:
                "What changes when the Format is package-resident and calls send only an ID, with flat output held fixed?",
            backends: ["vir-flat", "vir-resident"],
            design: "controlled",
            variable: "Input residency: transferred Format ↔ package-resident format ID",
            controls: ["VIR runtime", "prettyM logic", "flat output", "column budget"],
            measures:
                "Incremental cost of transferring and reconstructing an otherwise static input.",
        },
        {
            id: "all",
            label: "All backends",
            question:
                "Exploratory overview only: multiple implementation and ABI variables change at the same time.",
            backends: ["js", "vir", "vir-format", "vir-flat", "vir-resident", "native", "llvm"],
            design: "exploratory",
            variable: "Runtime, input, output, width, and ownership boundaries",
            controls: [
                "compact Format source",
                "annotations",
                "column budget",
                "final HTML semantics",
            ],
            measures:
                "Overview and correctness only. Do not attribute a timing delta to one cause.",
        },
    ];
    if (typeof config.experiment !== "string") config.experiment = "implementations";
})();
