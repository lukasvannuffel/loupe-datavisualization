// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { KMGroup, KMPlotData } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import type { KMSpec } from "@/lib/chartSpec/types";

import { KaplanMeierChart } from "../KaplanMeierChart";

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

const installResizeObserver = (): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (): void => {
            trigger([
                {
                    contentRect: {
                        width: 400,
                        height: 320,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        bottom: 320,
                        right: 400,
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
        installResizeObserver();
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

    it("draws censoring tick lines and CI bands at opacity 0.12", async () => {
        const { container } = render(<KaplanMeierChart data={plotData(1)} spec={kmSpec} />);
        await waitFor(() => {
            expect(container.querySelectorAll("line.km-censor").length).toBe(1);
        });
        const ci = container.querySelector("path.km-ci");
        expect(ci?.getAttribute("opacity")).toBe("0.12");
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
});
