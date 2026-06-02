// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { XYSpec } from "@/lib/chartSpec/types";

import { XYChart } from "../XYChart";

const scaleLinearDomainCalls: number[][] = [];

vi.mock("d3-scale", async (importOriginal) => {
    const actual = await importOriginal<typeof import("d3-scale")>();

    return {
        ...actual,
        scaleLinear: () => {
            const scale = actual.scaleLinear();
            const baseDomain = scale.domain.bind(scale);
            scale.domain = ((domain?: ReadonlyArray<number> | number) => {
                if (Array.isArray(domain)) {
                    scaleLinearDomainCalls.push([...domain]);
                }

                if (domain === undefined) {
                    return baseDomain();
                }

                return baseDomain(domain as Parameters<typeof baseDomain>[0]);
            }) as typeof scale.domain;

            return scale;
        },
    };
});

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const installResizeObserver = (): void => {
    class MockResizeObserver {
        constructor(cb: ObserverCallback) {
            trigger = cb;
        }
        observe = (): void => {
            trigger([
                {
                    contentRect: {
                        width: 420,
                        height: 320,
                        x: 0,
                        y: 0,
                        top: 0,
                        left: 0,
                        bottom: 320,
                        right: 420,
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

const makeSpec = (): XYSpec => {
    const spec = createDefaultChartSpec("xy", {
        id: "xy-scale-spec",
        createdAt: "2026-06-02T08:00:00.000Z",
    });
    if (spec.kind !== "xy") {
        throw new Error("expected xy spec");
    }

    return spec;
};

const firstXYDomains = async (): Promise<{
    readonly xDomain: readonly [number, number];
    readonly yDomain: readonly [number, number];
}> => {
    await waitFor(() => {
        expect(scaleLinearDomainCalls.length).toBeGreaterThanOrEqual(2);
    });

    const x = scaleLinearDomainCalls[0];
    const y = scaleLinearDomainCalls[1];
    if (x === undefined || y === undefined || x.length < 2 || y.length < 2) {
        throw new Error("expected x and y domain captures");
    }

    return {
        xDomain: [x[0], x[1]],
        yDomain: [y[0], y[1]],
    };
};

describe("XYChart - axis domains", () => {
    beforeEach(() => {
        scaleLinearDomainCalls.length = 0;
        installResizeObserver();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("x-domain contains all data points with padding, no forced zero", async () => {
        const data: XYPlotData = {
            kind: "xy",
            groups: [{ label: "A", points: [{ x: 2, y: 1 }, { x: 4, y: 2 }, { x: 6, y: 4 }, { x: 8, y: 5 }] }],
            regressions: [],
            regressionSkipped: false,
            xMin: 2,
            xMax: 8,
            yMin: 1,
            yMax: 5,
        };

        render(<XYChart spec={makeSpec()} data={data} mode="scatter" showRegression={false} />);
        const { xDomain } = await firstXYDomains();

        expect(xDomain[0]).toBeLessThan(2);
        expect(xDomain[1]).toBeGreaterThan(8);
        expect(xDomain[0]).toBeGreaterThan(0);
    });

    it("does not produce degenerate domain when all x-values are identical", async () => {
        const data: XYPlotData = {
            kind: "xy",
            groups: [{ label: "A", points: [{ x: 5, y: 1 }, { x: 5, y: 3 }, { x: 5, y: 6 }] }],
            regressions: [],
            regressionSkipped: true,
            xMin: 5,
            xMax: 5,
            yMin: 1,
            yMax: 6,
        };

        render(<XYChart spec={makeSpec()} data={data} mode="scatter" showRegression={false} />);
        const { xDomain } = await firstXYDomains();

        expect(xDomain[0]).not.toBe(xDomain[1]);
        expect(Number.isFinite(xDomain[0])).toBe(true);
        expect(Number.isFinite(xDomain[1])).toBe(true);
    });

    it("produces readable domain from two points", async () => {
        const data: XYPlotData = {
            kind: "xy",
            groups: [{ label: "A", points: [{ x: 10, y: 50 }, { x: 20, y: 70 }] }],
            regressions: [],
            regressionSkipped: true,
            xMin: 10,
            xMax: 20,
            yMin: 50,
            yMax: 70,
        };

        render(<XYChart spec={makeSpec()} data={data} mode="line" showRegression={false} />);
        const { xDomain, yDomain } = await firstXYDomains();

        expect(Number.isFinite(xDomain[0])).toBe(true);
        expect(Number.isFinite(xDomain[1])).toBe(true);
        expect(Number.isFinite(yDomain[0])).toBe(true);
        expect(Number.isFinite(yDomain[1])).toBe(true);
        expect(xDomain[0]).toBeLessThan(xDomain[1]);
        expect(yDomain[0]).toBeLessThan(yDomain[1]);
    });

    // MUTATION-VERIFY:
    //   src/components/charts/d3/XYChart.tsx:92
    //   - const xSpan = Math.max(data.xMax - data.xMin, 1e-6);
    //   + const xSpan = data.xMax - data.xMin;
    //   Test: "does not produce degenerate domain when all x-values are identical" goes RED.
    //   Verified manually: 2026-06-02. REVERTED.
});
