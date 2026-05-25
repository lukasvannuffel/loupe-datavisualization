// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { LongitudinalData, XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { XYSpec } from "@/lib/chartSpec/types";

import { XYChart } from "@/components/charts/d3/XYChart";

import { ChartLegend } from "../ChartLegend";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const xyFixture: XYPlotData = {
    kind: "xy",
    groups: [
        {
            label: "A",
            points: [
                { x: 0, y: 1 },
                { x: 1, y: 2 },
                { x: 2, y: 3 },
            ],
        },
        {
            label: "B",
            points: [
                { x: 0, y: 2 },
                { x: 1, y: 3 },
                { x: 2, y: 4 },
            ],
        },
    ],
    regressions: [],
    regressionSkipped: false,
    xMin: 0,
    xMax: 2,
    yMin: 1,
    yMax: 4,
};

const longitudinalFixture: LongitudinalData = {
    kind: "longitudinal",
    groups: [
        {
            label: "A",
            points: [
                { visit: 1, mean: 10, sem: 1, n: 3 },
                { visit: 2, mean: 12, sem: 1, n: 3 },
            ],
        },
    ],
    xMin: 1,
    xMax: 2,
    yMin: 9,
    yMax: 15,
};

const installResizeObserver = (width: number): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (): void => {
            trigger([
                {
                    contentRect: {
                        width,
                        height: 320,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        bottom: 320,
                        right: width,
                        toJSON: () => ({}),
                    },
                } as ResizeObserverEntry,
            ]);
        };
        unobserve = (): void => undefined;
        disconnect = (): void => undefined;
    }

    vi.stubGlobal("ResizeObserver", MockResizeObserver);
};

const testXySpec = (patch?: Partial<XYSpec>): XYSpec => {
    const spec = createDefaultChartSpec("xy", {
        id: "legend-xy-spec",
        createdAt: "2026-05-20T10:00:00.000Z",
    });
    if (spec.kind !== "xy") {
        throw new Error("expected xy spec");
    }

    return { ...spec, ...patch };
};

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("ChartLegend", () => {
    it("renders for charts with 2+ groups", () => {
        render(
            <ChartLegend
                chartKind="xy"
                groups={[
                    { label: "A" },
                    { label: "B" },
                ]}
                mode="scatter"
                palette="editorial"
            />,
        );

        expect(screen.getByRole("list", { name: /legend/i })).toBeTruthy();
    });

    it("does NOT render for single-group charts", () => {
        render(
            <ChartLegend
                chartKind="xy"
                groups={[{ label: "Only" }]}
                mode="scatter"
                palette="editorial"
            />,
        );

        expect(screen.queryByRole("list", { name: /legend/i })).toBeNull();
    });

    it("legend labels match group labels in insertion order", () => {
        render(
            <ChartLegend
                chartKind="xy"
                groups={[{ label: "Placebo" }, { label: "GLP-1 RA" }]}
                mode="line"
                palette="editorial"
            />,
        );

        const items = screen.getAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(items[0]?.textContent).toContain("Placebo");
        expect(items[1]?.textContent).toContain("GLP-1 RA");
    });

    it("XY scatter mode legend uses marker shapes, not line segments", () => {
        const { container } = render(
            <ChartLegend
                chartKind="xy"
                groups={[{ label: "A" }, { label: "B" }]}
                mode="scatter"
                palette="editorial"
            />,
        );

        const legendGlyphs = container.querySelectorAll('[data-role="legend-glyph-marker"]');
        expect(legendGlyphs).toHaveLength(2);
        expect(container.querySelectorAll('[data-role="legend-glyph-line"]')).toHaveLength(0);
    });

    it("XY line mode legend uses line segments, not markers", () => {
        const { container } = render(
            <ChartLegend
                chartKind="xy"
                groups={[{ label: "A" }, { label: "B" }]}
                mode="line"
                palette="editorial"
            />,
        );

        const legendGlyphs = container.querySelectorAll('[data-role="legend-glyph-line"]');
        expect(legendGlyphs).toHaveLength(2);
        expect(container.querySelectorAll('[data-role="legend-glyph-marker"]')).toHaveLength(0);
    });

    it("XY both mode legend uses line glyphs with markers", () => {
        const { container } = render(
            <ChartLegend
                chartKind="xy"
                groups={[{ label: "A" }, { label: "B" }]}
                mode="both"
                palette="editorial"
            />,
        );

        const lineGlyphs = container.querySelectorAll('[data-role="legend-glyph-line"]');
        expect(lineGlyphs).toHaveLength(2);
        expect(lineGlyphs[0]?.querySelector("path")).toBeTruthy();
        expect(lineGlyphs[1]?.querySelector("path")).toBeTruthy();
    });

    it("bar kind uses bar glyphs", () => {
        const { container } = render(
            <ChartLegend
                chartKind="bar"
                groups={[{ label: "A" }, { label: "B" }]}
                palette="okabe-ito"
            />,
        );

        expect(container.querySelectorAll('[data-role="legend-glyph-bar"]')).toHaveLength(2);
    });

    it("km kind uses line glyphs", () => {
        const { container } = render(
            <ChartLegend
                chartKind="km"
                groups={[{ label: "A" }, { label: "B" }]}
                palette="editorial"
            />,
        );

        expect(container.querySelectorAll('[data-role="legend-glyph-line"]')).toHaveLength(2);
    });

    it("box kind uses box glyphs", () => {
        const { container } = render(
            <ChartLegend
                chartKind="box"
                groups={[{ label: "A" }, { label: "B" }]}
                palette="wong"
            />,
        );

        expect(container.querySelectorAll('[data-role="legend-glyph-box"]')).toHaveLength(2);
    });
});

describe("ChartLegend XYChart integration", () => {
    let bboxSpy: ReturnType<typeof vi.spyOn> | undefined;

    beforeEach(() => {
        installResizeObserver(380);
        bboxSpy = vi
            .spyOn(SVGGraphicsElement.prototype, "getBBox")
            .mockImplementation(
                () =>
                    ({
                        width: 40,
                        height: 12,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        right: 40,
                        bottom: 12,
                        toJSON: () => ({}),
                    }) as DOMRect,
            );
    });

    afterEach(() => {
        bboxSpy?.mockRestore();
    });

    it("legend renders for charts with 2+ groups", async () => {
        render(
            <XYChart
                data={xyFixture}
                mode="scatter"
                showRegression={false}
                spec={testXySpec({ mode: "scatter", showRegression: false })}
            />,
        );

        await waitFor(() => {
            expect(screen.getByRole("list", { name: /legend/i })).toBeTruthy();
        });
    });

    it("legend does NOT render for single-group charts", async () => {
        render(
            <XYChart
                data={longitudinalFixture}
                mode="line"
                showRegression={false}
                spec={testXySpec({ mode: "line", showRegression: false })}
            />,
        );

        await waitFor(() => {
            expect(screen.queryByRole("list", { name: /legend/i })).toBeNull();
        });
    });
});
