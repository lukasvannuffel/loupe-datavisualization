// @vitest-environment happy-dom

import { scaleLinear } from "d3-scale";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attachCustomizations } from "@/lib/chartSpec/labels/buildCustomizations";
import type { KMGroup, KMPlotData } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import type { KMSpec } from "@/lib/chartSpec/types";

import { X_AXIS_LABEL_GAP_PX, xAxisLabelY } from "../chartLabelLayout";
import { KaplanMeierChart } from "../KaplanMeierChart";
import { axisTickCountForWidth } from "../applyAxes";
import { marginWithLabels } from "../applyChartLabels";
import { DEFAULT_MARGIN } from "../chart.types";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const kmSpec: KMSpec = {
    version: 1,
    id: "km-spec-1",
    createdAt: "2026-05-20T10:00:00.000Z",
    title: "Survival by group",
    showLegend: true,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "km",
    legendA: "Arm A",
    dashB: false,
    showAtRisk: true,
    showStats: false,
    timeUnit: "months",
};

const point = (
    t: number,
    survival: number,
    censored: boolean,
): KMGroup["points"][number] => ({
    censored,
    ciLower: Math.max(0, survival - 0.1),
    ciUpper: Math.min(1, survival + 0.1),
    nAtRisk: 10,
    survival,
    t,
});

const makeGroup = (label: string, censoredCount: number): KMGroup => ({
    atRiskTicks: [{ nAtRisk: 10, t: 0 }],
    label,
    nEvents: 3,
    nTotal: 10,
    points: [
        point(5, 0.9, false),
        point(10, 0.8, censoredCount > 0),
        point(15, 0.7, false),
    ],
});

const plotData = (groupCount: number): KMPlotData => ({
    kind: "km",
    tMax: 30,
    groups: Array.from({ length: groupCount }, (_, i) => makeGroup(`G${i + 1}`, i === 0 ? 1 : 0)),
});

const defaultKMSpec = (): KMSpec => {
    const spec = attachCustomizations(
        {
            ...kmSpec,
            id: "km-label-spec",
            createdAt: "2026-05-20T10:00:00.000Z",
        },
        { time: "time_months", event: "event" },
    );

    if (spec.kind !== "km") {
        throw new Error("expected km spec");
    }

    return spec;
};

const twoGroupFixtureWithCensoring: KMPlotData = {
    kind: "km",
    tMax: 30,
    groups: [
        {
            atRiskTicks: [{ nAtRisk: 10, t: 0 }],
            label: "G1",
            nEvents: 2,
            nTotal: 10,
            points: [
                point(5, 0.9, false),
                point(10, 0.8, true),
                point(15, 0.7, false),
            ],
        },
        {
            atRiskTicks: [{ nAtRisk: 10, t: 0 }],
            label: "G2",
            nEvents: 2,
            nTotal: 10,
            points: [
                point(6, 0.85, false),
                point(12, 0.75, true),
                point(18, 0.65, false),
            ],
        },
    ],
};

const singleCensorFixture: KMPlotData = {
    kind: "km",
    tMax: 30,
    groups: [
        {
            atRiskTicks: [{ nAtRisk: 10, t: 0 }],
            label: "A",
            nEvents: 1,
            nTotal: 10,
            points: [
                point(5, 0.9, false),
                point(10, 0.8, true),
            ],
        },
    ],
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
        disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
};

describe("KaplanMeierChart", () => {
    beforeEach(() => {
        installResizeObserver(400);
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each([1, 2, 4] as const)("renders %i group(s)", async (count) => {
        const { container } = render(<KaplanMeierChart data={plotData(count)} spec={kmSpec} />);
        await waitFor(() => {
            expect(container.querySelectorAll("path.km-curve").length).toBe(count);
        });
    });

    it("renders exactly one x-axis label on KM chart", async () => {
        const spec = defaultKMSpec();
        const { container, rerender } = render(
            <KaplanMeierChart data={plotData(2)} spec={spec} />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll('[data-role="axis-label-x"]').length).toBe(1);
        });

        rerender(
            <KaplanMeierChart
                data={plotData(2)}
                spec={{ ...spec, showGrid: !spec.showGrid }}
            />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll('[data-role="axis-label-x"]').length).toBe(1);
        });
    });

    // MUTATION-VERIFY:
    //   KaplanMeierChart.tsx:67 — comment out the clearStaticChartLabels(svgEl) call.
    //   Test: "renders exactly one x-axis label on KM chart".
    //   Second redraw appends a second axis-label text → length 2 → RED.
    //   Verified manually: 2026-05-25. REVERTED.

    it("places x-axis label below tick numbers", async () => {
        const spec = defaultKMSpec();
        const onSpecChange = (): void => undefined;
        const { container } = render(
            <KaplanMeierChart
                data={plotData(2)}
                spec={spec}
                onSpecChange={onSpecChange}
            />,
        );

        const chartHeight = 240;
        const margin = marginWithLabels(DEFAULT_MARGIN);
        const innerHeight = Math.max(
            0,
            chartHeight - margin.top - margin.bottom,
        );

        await waitFor(() => {
            const axisGroup = container.querySelector("g.x-axis");
            expect(axisGroup).toBeTruthy();

            const transform = axisGroup?.getAttribute("transform") ?? "";
            const match = /translate\([^,]+,\s*([\d.]+)\)/.exec(transform);
            expect(match).toBeTruthy();
            const axisLineY = Number(match![1]);

            const tickTexts = container.querySelectorAll("g.x-axis text");
            expect(tickTexts.length).toBeGreaterThan(0);

            let maxTickBottom = axisLineY;
            tickTexts.forEach((tick) => {
                const tickY = Number(tick.getAttribute("y") ?? 0);
                const dy = tick.getAttribute("dy") ?? "0";
                const dyEm = dy.includes("em") ? Number.parseFloat(dy) * 10 : 0;
                maxTickBottom = Math.max(maxTickBottom, axisLineY + tickY + dyEm);
            });

            const xLabelY = Number(
                container.querySelector('[data-role="axis-label-x"]')?.getAttribute("y"),
            );
            const expectedMinY = xAxisLabelY(margin, innerHeight, 0);

            expect(xLabelY).toBe(expectedMinY);
            expect(xLabelY).toBeGreaterThanOrEqual(
                maxTickBottom + X_AXIS_LABEL_GAP_PX,
            );
        });
    });

    // MUTATION-VERIFY:
    //   chartLabelLayout.ts:4 — set LINEAR_X_TICK_OVERFLOW_PX to 0.
    //   Test: "places x-axis label below tick numbers".
    //   xLabelY overlaps tick band → second expect fails → RED.
    //   Verified manually: 2026-05-25. REVERTED.

    it("chart title and x-axis label have distinct text content", async () => {
        const spec = defaultKMSpec();
        const onSpecChange = (): void => undefined;
        const { container } = render(
            <KaplanMeierChart
                data={plotData(2)}
                spec={spec}
                onSpecChange={onSpecChange}
            />,
        );

        await waitFor(() => {
            const title = container.querySelector('[data-role="chart-title"]')?.textContent;
            const xLabel = container.querySelector('[data-role="axis-label-x"]')?.textContent;
            expect(title).toBeTruthy();
            expect(xLabel).toBeTruthy();
            expect(title).not.toBe(xLabel);
        });
    });

    it("editorial palette with more than two groups uses ink for all curves", async () => {
        const { container } = render(
            <KaplanMeierChart
                data={plotData(4)}
                spec={{ ...kmSpec, customizations: { palette: "editorial" } }}
            />,
        );
        await waitFor(() => {
            expect(container.querySelectorAll("path.km-curve").length).toBe(4);
        });

        const groupNodes = container.querySelectorAll("g.km-group[data-group-index]");
        expect(groupNodes.length).toBe(4);

        for (const curve of container.querySelectorAll("path.km-curve")) {
            expect(curve.getAttribute("stroke")).toMatch(/var\(--ink\)|#0[eE]0[eE]0[eE]/);
        }
    });

    it("draws censoring tick lines and CI bands at opacity 0.12", async () => {
        const { container } = render(<KaplanMeierChart data={plotData(1)} spec={kmSpec} />);
        await waitFor(() => {
            expect(container.querySelectorAll("line.km-censor").length).toBe(1);
        });
        const ci = container.querySelector("path.km-ci");
        expect(ci?.getAttribute("opacity")).toBe("0.12");
    });

    it("renders censoring ticks as solid hash marks regardless of curve dash pattern", async () => {
        const { container } = render(
            <KaplanMeierChart data={twoGroupFixtureWithCensoring} spec={kmSpec} />,
        );
        await waitFor(() => {
            expect(container.querySelectorAll('line[data-role="censor-tick"]').length).toBeGreaterThan(
                0,
            );
        });

        const ticks = container.querySelectorAll('line[data-role="censor-tick"]');
        for (const tick of ticks) {
            const dasharray = tick.getAttribute("stroke-dasharray");
            expect(dasharray).toBe('none');
        }
    });

    it("censoring tick total length is 8px (4px above, 4px below the survival point)", async () => {
        const { container } = render(
            <KaplanMeierChart data={singleCensorFixture} spec={kmSpec} />,
        );
        await waitFor(() => {
            expect(container.querySelector('line[data-role="censor-tick"]')).toBeTruthy();
        });

        const tick = container.querySelector('line[data-role="censor-tick"]');
        const y1 = Number(tick?.getAttribute("y1"));
        const y2 = Number(tick?.getAttribute("y2"));
        expect(Math.abs(y2 - y1)).toBe(8);
        expect(tick?.getAttribute('x1')).toBe(tick?.getAttribute('x2'));
    });

    it("keeps SVG plot height fixed when ResizeObserver reports a tall contentRect", async () => {
        const { container } = render(<KaplanMeierChart data={plotData(1)} spec={kmSpec} />);
        await waitFor(() => {
            const svg = container.querySelector("svg.rec-chart-svg");
            expect(svg?.getAttribute("height")).toBe("240");
        });
        trigger([
            {
                contentRect: {
                    width: 500,
                    height: 800,
                    x: 0,
                    y: 0,
                    top: 0,
                    left: 0,
                    bottom: 800,
                    right: 500,
                    toJSON: () => ({}),
                },
            } as ResizeObserverEntry,
        ]);
        await waitFor(() => {
            const svg = container.querySelector("svg.rec-chart-svg");
            expect(svg?.getAttribute("height")).toBe("240");
            expect(svg?.getAttribute("width")).toBe("500");
        });
    });

    it("renders horizontal gridlines when showGrid is true", async () => {
        const { container } = render(
            <KaplanMeierChart data={plotData(1)} spec={{ ...kmSpec, showGrid: true }} />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll(".chart-grid line").length).toBeGreaterThan(0);
        });
    });

    it("hides horizontal gridlines when showGrid is false", async () => {
        const { container } = render(
            <KaplanMeierChart data={plotData(1)} spec={{ ...kmSpec, showGrid: false }} />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("path.km-curve").length).toBe(1);
        });
        expect(container.querySelectorAll(".chart-grid line").length).toBe(0);
    });

    it("applies strokeWeight to survival curves", async () => {
        const { container } = render(
            <KaplanMeierChart data={plotData(1)} spec={{ ...kmSpec, strokeWeight: 2.5 }} />,
        );

        await waitFor(() => {
            expect(container.querySelector("path.km-curve")?.getAttribute("stroke-width")).toBe("2.5");
        });
    });

    it("renders HR and log-rank annotation inside the SVG when showStats is true", async () => {
        const { container } = render(
            <KaplanMeierChart
                data={plotData(1)}
                spec={{ ...kmSpec, showStats: true }}
                statTests={[
                    { label: "Cox HR 0.74 (95% CI 0.61-0.89)" },
                    { label: "log-rank p < 0.001" },
                ]}
            />,
        );

        await waitFor(() => {
            const lines = container.querySelectorAll('[data-role="km-stat-line"]');
            expect(lines.length).toBe(2);
            expect(lines[0]?.textContent).toContain("Cox HR");
            expect(lines[1]?.textContent).toContain("log-rank");
        });
    });

    it("hides HR and log-rank annotation when showStats is false", async () => {
        const { container } = render(
            <KaplanMeierChart data={plotData(1)} spec={{ ...kmSpec, showStats: false }} />,
        );

        await waitFor(() => {
            expect(container.querySelectorAll("path.km-curve").length).toBe(1);
        });
        expect(container.querySelectorAll('[data-role="km-stat-line"]').length).toBe(0);
    });

    it.each([
        { width: 400, tickHint: 4 },
        { width: 800, tickHint: 6 },
    ] as const)(
        "at-risk table matches x-axis tick count at width $width px",
        async ({ width, tickHint }) => {
            vi.restoreAllMocks();
            installResizeObserver(width);
            vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
                cb(0);

                return 1;
            });

            const { container } = render(<KaplanMeierChart data={plotData(1)} spec={kmSpec} />);
            await waitFor(() => {
                expect(container.querySelector("table.km-at-risk-table")).toBeTruthy();
            });

            const tickCount = axisTickCountForWidth(width);
            expect(tickCount).toBe(tickHint);
            const expectedTicks = scaleLinear().domain([0, 30]).range([0, width]).ticks(tickCount);
            const timeHeaders = container.querySelectorAll(
                "table.km-at-risk-table thead th[scope='col']",
            );
            expect(timeHeaders.length).toBe(expectedTicks.length + 1);

            const headerTexts = Array.from(timeHeaders)
                .slice(1)
                .map((th) => th.textContent);
            expect(headerTexts).toEqual(expectedTicks.map(String));
        },
    );
});
