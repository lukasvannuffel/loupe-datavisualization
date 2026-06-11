import { describe, expect, it } from "vitest";

import type { XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";

import { buildXyCaption, buildXyMetaLine } from "../exportXyFigureText";

const basePlotData = (overrides: Partial<XYPlotData> = {}): XYPlotData => ({
    kind: "xy",
    groups: [{ label: "All", points: [{ x: 0, y: 0 }] }],
    regressions: [],
    regressionSkipped: false,
    xMin: 0,
    xMax: 1,
    yMin: 0,
    yMax: 1,
    ...overrides,
});

describe("buildXyMetaLine", () => {
    it("formats a single group as n only", () => {
        const plotData = basePlotData({
            groups: [
                {
                    label: "All",
                    points: [
                        { x: 0, y: 0 },
                        { x: 1, y: 1 },
                        { x: 2, y: 2 },
                        { x: 3, y: 3 },
                        { x: 4, y: 4 },
                    ],
                },
            ],
        });

        expect(buildXyMetaLine(plotData)).toBe("n = 5");
    });

    it("formats two groups with total point count", () => {
        const plotData = basePlotData({
            groups: [
                {
                    label: "Stage III",
                    points: Array.from({ length: 98 }, (_, index) => ({ x: index, y: index })),
                },
                {
                    label: "Stage IV",
                    points: Array.from({ length: 82 }, (_, index) => ({ x: index, y: index })),
                },
            ],
        });

        expect(buildXyMetaLine(plotData)).toBe("n = 180 · groups = 2");
    });
});

describe("buildXyCaption", () => {
    it("returns the no-regression fallback without fabricated statistics", () => {
        const plotData = basePlotData({
            regressions: [],
            regressionSkipped: false,
        });

        const caption = buildXyCaption(plotData);

        expect(caption).toBe("Scatter plot. No regression computed.");
        expect(caption).not.toMatch(/p\s*=/i);
        expect(caption).not.toMatch(/mixed/i);
    });

    it("formats a single regression", () => {
        const plotData = basePlotData({
            regressions: [{ label: "All", slope: 1, intercept: 0, r2: 0.28 }],
        });

        expect(buildXyCaption(plotData)).toBe("Linear regression: r² = 0.28.");
    });

    it("formats two regressions with group labels", () => {
        const plotData = basePlotData({
            groups: [
                { label: "Stage III", points: [{ x: 0, y: 0 }] },
                { label: "Stage IV", points: [{ x: 1, y: 1 }] },
            ],
            regressions: [
                { label: "Stage III", slope: 1, intercept: 0, r2: 0.31 },
                { label: "Stage IV", slope: 0.5, intercept: 1, r2: 0.22 },
            ],
        });

        const caption = buildXyCaption(plotData);

        expect(caption).toContain("Stage III");
        expect(caption).toContain("Stage IV");
        expect(caption).toContain("r² = 0.31");
        expect(caption).toContain("r² = 0.22");
    });

    it("returns the no-regression fallback when regression is skipped", () => {
        const plotData = basePlotData({
            regressions: [{ label: "All", slope: 1, intercept: 0, r2: 0.28 }],
            regressionSkipped: true,
        });

        expect(buildXyCaption(plotData)).toBe("Scatter plot. No regression computed.");
    });

    /**
     * MUTATION-VERIFY
     * Mutation: `src/components/pages/__tests__/exportXyFigureText.test.ts` changed
     * `regressions` in the two-regression fixture to `[]`.
     * Red test: `formats two regressions with group labels`.
     * Verified manually: 2026-06-11. REVERTED.
     */
    it("formats two regressions with group labels — mutation anchor", () => {
        const plotData = basePlotData({
            groups: [
                { label: "Stage III", points: [{ x: 0, y: 0 }] },
                { label: "Stage IV", points: [{ x: 1, y: 1 }] },
            ],
            regressions: [
                { label: "Stage III", slope: 1, intercept: 0, r2: 0.31 },
                { label: "Stage IV", slope: 0.5, intercept: 1, r2: 0.22 },
            ],
        });

        expect(buildXyCaption(plotData)).toMatch(/Stage III: r² = 0\.31/);
        expect(buildXyCaption(plotData)).toMatch(/Stage IV: r² = 0\.22/);
    });
});
