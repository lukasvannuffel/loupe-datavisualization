import { describe, expect, it } from "vitest";

import type { BarErrorPlotData, BoxPlotData, ChartSpec, KMPlotData, XYPlotData } from "@/lib/chartSpec/types";

import { sampleString } from "../sampleStrings";

describe("sampleString", () => {
    it("formats barError sample", () => {
        const spec: ChartSpec = {
            kind: "barError",
            version: 1,
            id: "bar",
            createdAt: "2026-05-27T12:00:00.000Z",
            title: "Bar",
            showLegend: true,
            showGrid: false,
            paletteId: "editorial",
            strokeWeight: 1.5,
            errorBarType: "ci95",
            annotations: [],
        };
        const plotData: BarErrorPlotData = {
            groups: [
                { label: "A", mean: 1, sd: 1, n: 10 },
                { label: "B", mean: 2, sd: 1, n: 8 },
            ],
            kind: "barError",
        };

        expect(sampleString(spec, plotData)).toBe("n = 18");
    });

    it("formats km sample", () => {
        const spec: ChartSpec = {
            kind: "km",
            version: 1,
            id: "km",
            createdAt: "2026-05-27T12:00:00.000Z",
            title: "KM",
            showLegend: true,
            showGrid: false,
            paletteId: "editorial",
            strokeWeight: 1.5,
            legendA: "A",
            dashB: false,
            showAtRisk: true,
            showStats: true,
            timeUnit: "months",
        };
        const plotData: KMPlotData = {
            groups: [
                {
                    atRiskTicks: [],
                    nTotal: 10,
                    points: [
                        { t: 1, survival: 0.9, nAtRisk: 10, censored: true, ciLower: 0.8, ciUpper: 1 },
                        { t: 2, survival: 0.8, nAtRisk: 9, censored: false, ciLower: 0.7, ciUpper: 0.9 },
                    ],
                    nEvents: 0,
                    label: "A",
                },
                {
                    atRiskTicks: [],
                    nTotal: 8,
                    points: [{ t: 1, survival: 0.95, nAtRisk: 8, censored: true, ciLower: 0.9, ciUpper: 1 }],
                    nEvents: 0,
                    label: "B",
                },
            ],
            kind: "km",
            tMax: 12,
        };

        expect(sampleString(spec, plotData)).toBe("n = 18 · censored = 2");
    });

    it("formats box sample", () => {
        const spec: ChartSpec = {
            kind: "box",
            version: 1,
            id: "box",
            createdAt: "2026-05-27T12:00:00.000Z",
            title: "Box",
            showLegend: true,
            showGrid: false,
            paletteId: "editorial",
            strokeWeight: 1.5,
            showOutliers: true,
            showMeanMarker: true,
            notched: false,
        };
        const plotData: BoxPlotData = {
            groups: [
                { kind: "box", label: "A", n: 10, min: 0, q1: 1, median: 2, q3: 3, max: 4, mean: 2, outliers: [], notchLower: 1.5, notchUpper: 2.5 },
                { kind: "box", label: "B", n: 8, min: 0, q1: 1, median: 2, q3: 3, max: 4, mean: 2, outliers: [], notchLower: 1.5, notchUpper: 2.5 },
                { kind: "box", label: "C", n: 2, min: 0, q1: 1, median: 2, q3: 3, max: 4, mean: 2, outliers: [], notchLower: 1.5, notchUpper: 2.5 },
            ],
            kind: "box",
            yMin: 0,
            yMax: 4,
        };

        expect(sampleString(spec, plotData)).toBe("n = 20 · groups = 3");
    });

    it("formats xy sample for scatter/line aggregation", () => {
        const spec: ChartSpec = {
            kind: "xy",
            version: 1,
            id: "xy",
            createdAt: "2026-05-27T12:00:00.000Z",
            title: "XY",
            showLegend: true,
            showGrid: false,
            paletteId: "editorial",
            strokeWeight: 1.5,
            mode: "both",
            showRegression: true,
            showErrorBands: false,
        };
        const plotData: XYPlotData = {
            groups: [{ label: "A", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }, { label: "B", points: [{ x: 2, y: 2 }] }],
            kind: "xy",
            regressions: [],
            regressionSkipped: false,
            xMin: 0,
            xMax: 2,
            yMin: 0,
            yMax: 2,
        };

        expect(sampleString(spec, plotData)).toBe("n = 3 · groups = 2");
    });
});
