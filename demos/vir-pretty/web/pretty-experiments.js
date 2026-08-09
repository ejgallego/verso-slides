// @ts-check
/* Named comparison questions for the standalone pretty-printer demo. */
(function () {
    "use strict";

    /**
     * @typedef {{ id: string, label: string, question: string, backends: string[] }} DemoExperiment
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
        },
        {
            id: "vir-transport",
            label: "VIR input transport",
            question:
                "What changes when VIR receives JSON text versus the typed Lean Format object ABI, with segment output held fixed?",
            backends: ["vir", "vir-format"],
        },
        {
            id: "vir-output",
            label: "VIR output boundary",
            question:
                "What changes when VIR returns flat text/style events instead of copied tagged segments, with typed input held fixed?",
            backends: ["vir-format", "vir-flat"],
        },
        {
            id: "vir-residency",
            label: "VIR input residency",
            question:
                "What changes when the Format is package-resident and calls send only an ID, with flat output held fixed?",
            backends: ["vir-flat", "vir-resident"],
        },
        {
            id: "all",
            label: "All backends",
            question:
                "Exploratory overview only: multiple implementation and ABI variables change at the same time.",
            backends: ["js", "vir", "vir-format", "vir-flat", "vir-resident", "native", "llvm"],
        },
    ];
    if (typeof config.experiment !== "string") config.experiment = "implementations";
})();
