registerPrettyBackend({
    id: "fixture",
    label: "Fixture",
    capabilities: { output: "segments", width: "columns" },
    status: function () {
        return "ready";
    },
    renderTimed: function (_format, _annotations, _pixelWidth, _measurer) {
        return {
            segments: [{ text: "fixture output", tags: [] }],
            timings: {
                marshalMs: 1,
                executeMs: 2,
                decodeMs: 3,
                renderMs: 0,
                totalMs: 6,
                details: [
                    { label: "Fixture input", valueMs: 0.75, phase: "marshal" },
                    { label: "Fixture engine", valueMs: 1.5, phase: "execute" },
                ],
            },
        };
    },
});
