// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { KMPlotData, KMPoint } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import type { KMSpec } from "@/lib/chartSpec/types";

import { KaplanMeierChart } from "../KaplanMeierChart";

const scaleLinearDomainCalls: number[][] = [];
const scaleLinearDomainRangeSnapshots: Array<{
    readonly domain: readonly number[];
    readonly range: readonly number[];
}> = [];

vi.mock("d3-scale", async (importOriginal) => {
    const actual = await importOriginal<typeof import("d3-scale")>();

    return {
        ...actual,
        scaleLinear: () => {
            const scale = actual.scaleLinear();
            const baseDomain = scale.domain.bind(scale);
            const baseRange = scale.range.bind(scale);
            scale.domain = ((domain?: ReadonlyArray<number> | number) => {
                if (Array.isArray(domain)) {
                    scaleLinearDomainCalls.push([...domain]);
                }

                if (domain === undefined) {
                    return baseDomain();
                }

                return baseDomain(domain as Parameters<typeof baseDomain>[0]);
            }) as typeof scale.domain;
            scale.range = ((range?: ReadonlyArray<number> | number) => {
                if (Array.isArray(range)) {
                    const activeDomain = baseDomain();
                    scaleLinearDomainRangeSnapshots.push({
                        domain: [...activeDomain],
                        range: [...range],
                    });
                }

                if (range === undefined) {
                    return baseRange();
                }

                return baseRange(range as Parameters<typeof baseRange>[0]);
            }) as typeof scale.range;

            return scale;
        },
    };
});

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const spec: KMSpec = {
    version: 1,
    id: "km-scale-spec",
    createdAt: "2026-06-02T08:00:00.000Z",
    title: "KM scale test",
    showLegend: true,
    showGrid: true,
    paletteId: "monochrome",
    strokeWeight: 1.5,
    kind: "km",
    legendA: "A",
    dashB: false,
    showAtRisk: false,
    showStats: false,
    timeUnit: "months",
};

const makePoint = (t: number, survival: number): KMPoint => ({
    t,
    survival,
    censored: false,
    nAtRisk: 10,
    ciLower: Math.max(0, survival - 0.1),
    ciUpper: Math.min(1, survival + 0.1),
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

const noEventsData: KMPlotData = {
    kind: "km",
    tMax: 24,
    groups: [
        {
            label: "Arm A",
            nTotal: 10,
            nEvents: 0,
            points: [makePoint(6, 1), makePoint(12, 1), makePoint(24, 1)],
            atRiskTicks: [{ t: 0, nAtRisk: 10 }],
        },
    ],
};

const reachesZeroData: KMPlotData = {
    kind: "km",
    tMax: 30,
    groups: [
        {
            label: "Arm B",
            nTotal: 10,
            nEvents: 10,
            points: [makePoint(5, 0.8), makePoint(10, 0.4), makePoint(15, 0), makePoint(30, 0)],
            atRiskTicks: [{ t: 0, nAtRisk: 10 }],
        },
    ],
};

const expectYDomainInvariant = async (): Promise<void> => {
    await waitFor(() => {
        expect(scaleLinearDomainRangeSnapshots.length).toBeGreaterThan(0);
    });

    const yScaleSnapshots = scaleLinearDomainRangeSnapshots.filter(
        (snapshot) =>
            snapshot.range.length === 2 &&
            snapshot.range[0] > snapshot.range[1] &&
            snapshot.range[1] === 0,
    );

    expect(yScaleSnapshots.length).toBeGreaterThan(0);
    for (const snapshot of yScaleSnapshots) {
        expect(snapshot.domain).toEqual([0, 1]);
    }
};

describe("KaplanMeierChart - y-axis domain", () => {
    beforeEach(() => {
        scaleLinearDomainCalls.length = 0;
        scaleLinearDomainRangeSnapshots.length = 0;
        installResizeObserver();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);

            return 1;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("is always [0, 1] regardless of input (hardcoded invariant)", async () => {
        render(<KaplanMeierChart spec={spec} data={noEventsData} />);

        await expectYDomainInvariant();
    });

    it("is [0, 1] when survival reaches 0 before t_max", async () => {
        render(<KaplanMeierChart spec={spec} data={reachesZeroData} />);

        await expectYDomainInvariant();
    });

    // MUTATION-VERIFY:
    //   src/components/charts/d3/KaplanMeierChart.tsx:79
    //   - .domain([0, 1])
    //   + .domain([0, 0.5])
    //   Test: "is [0, 1] when survival reaches 0 before t_max" goes RED.
    //   Verified manually: 2026-06-02. REVERTED.
});
