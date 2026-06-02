// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BoxPlotData } from "@/lib/chartSpec/aggregators/boxPlot.types";
import type { BoxSpec } from "@/lib/chartSpec/types";

import { BoxChart } from "../BoxChart";

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

const spec: BoxSpec = {
    version: 1,
    id: "box-scale-spec",
    createdAt: "2026-06-02T08:00:00.000Z",
    title: "Box scale test",
    showLegend: true,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "box",
    showOutliers: true,
    showMeanMarker: false,
    notched: false,
};

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

const latestDomain = async (): Promise<readonly [number, number]> => {
    await waitFor(() => {
        expect(scaleLinearDomainCalls.length).toBeGreaterThan(0);
    });

    const domain = scaleLinearDomainCalls.at(-1);
    if (domain === undefined || domain.length < 2) {
        throw new Error("expected y-domain capture");
    }

    return [domain[0], domain[1]];
};

describe("BoxChart - y-axis domain", () => {
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

    it("domain includes outliers beyond IQR fences", async () => {
        const outlierValue = 120;
        const data: BoxPlotData = {
            kind: "box",
            yMin: 4,
            yMax: outlierValue,
            groups: [
                {
                    kind: "box",
                    label: "A",
                    n: 11,
                    min: 4,
                    q1: 5,
                    median: 5.5,
                    q3: 6,
                    max: 7,
                    mean: 15,
                    outliers: [outlierValue],
                    notchLower: 5.2,
                    notchUpper: 5.8,
                },
            ],
        };

        render(<BoxChart spec={spec} data={data} />);
        const [, domainHi] = await latestDomain();

        expect(domainHi).toBeGreaterThan(outlierValue);
    });

    it("does not produce a degenerate scale for a single low-variance group", async () => {
        const data: BoxPlotData = {
            kind: "box",
            yMin: 5,
            yMax: 5.2,
            groups: [
                {
                    kind: "box",
                    label: "A",
                    n: 3,
                    min: 5,
                    q1: 5.05,
                    median: 5.1,
                    q3: 5.15,
                    max: 5.2,
                    mean: 5.1,
                    outliers: [],
                    notchLower: 5.07,
                    notchUpper: 5.13,
                },
            ],
        };

        render(<BoxChart spec={spec} data={data} />);
        const [domainLo, domainHi] = await latestDomain();

        expect(domainLo).toBeLessThan(domainHi);
        expect(Number.isFinite(domainLo)).toBe(true);
        expect(Number.isFinite(domainHi)).toBe(true);
    });

    // MUTATION-VERIFY:
    //   src/components/charts/d3/BoxChart.tsx:79-82
    //   - const ySpan = Math.max(data.yMax - data.yMin, 1e-6);
    //   - .domain([data.yMin - ySpan * Y_PADDING_RATIO, data.yMax + ySpan * Y_PADDING_RATIO])
    //   + const ySpan = Math.max(whiskerMax - data.yMin, 1e-6);
    //   + .domain([data.yMin - ySpan * Y_PADDING_RATIO, whiskerMax + ySpan * Y_PADDING_RATIO])
    //   Test: "domain includes outliers beyond IQR fences" goes RED.
    //   Verified manually: 2026-06-02. REVERTED.
});
