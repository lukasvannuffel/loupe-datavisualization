// @vitest-environment happy-dom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LoupeDataset } from "@/app/providers";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { Receipt } from "@/lib/chartSpec/types";
import type { XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";
import { brandRows } from "@/lib/parser/types";
import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { Recommendation } from "../Recommendation";

type ObserverCallback = (entries: ResizeObserverEntry[]) => void;

let trigger: ObserverCallback;

const push = vi.fn();
const replace = vi.fn();
const appendOverride = vi.fn();
const setSelectionMode = vi.fn();
const updateLatestOverrideReason = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: (): { push: typeof push; replace: typeof replace } => ({
        push,
        replace,
    }),
}));

const defaultMapping: Mapping = {
    event: "event",
    group: "arm",
    outcome: "value",
    time: "time",
    x: "x",
    y: "y",
};

vi.mock("@/app/providers", () => ({
    useAppState: (): {
        appendOverride: typeof appendOverride;
        intent: string;
        mapping: Mapping;
        setSelectionMode: typeof setSelectionMode;
        updateLatestOverrideReason: typeof updateLatestOverrideReason;
    } => ({
        appendOverride,
        intent: "",
        mapping: defaultMapping,
        setSelectionMode,
        updateLatestOverrideReason,
    }),
}));

vi.mock("@/components/charts/PublicationKM", () => ({
    PublicationKM: (): JSX.Element => <div data-testid="publication-km">Kaplan–Meier</div>,
}));

vi.mock("@/lib/chartSpec/aggregators/barError", () => ({
    aggregateBarError: vi.fn(),
}));

vi.mock("@/lib/chartSpec/aggregators/kaplanMeier", () => ({
    aggregateKaplanMeier: vi.fn(),
}));

vi.mock("@/components/charts/d3/BarErrorChart", () => ({
    BarErrorChart: (): JSX.Element => <div data-testid="bar-error-chart">Bar with errors</div>,
}));

vi.mock("@/components/charts/d3/KaplanMeierChart", () => ({
    KaplanMeierChart: (): JSX.Element => <div data-testid="km-chart">Kaplan–Meier chart</div>,
}));

vi.mock("@/lib/chartSpec/aggregators/boxPlot", () => ({
    aggregateBoxPlot: vi.fn(),
}));

vi.mock("@/components/charts/d3/BoxChart", () => ({
    BoxChart: (): JSX.Element => <div data-testid="box-chart">Box plot chart</div>,
}));

const xyRegressionFixture: XYPlotData = {
    kind: "xy",
    groups: [
        {
            label: "A",
            points: [
                { x: 1, y: 2 },
                { x: 2, y: 4 },
                { x: 3, y: 5 },
                { x: 4, y: 7 },
            ],
        },
        {
            label: "B",
            points: [
                { x: 1, y: 3 },
                { x: 2, y: 5 },
                { x: 3, y: 6 },
                { x: 4, y: 8 },
            ],
        },
    ],
    regressions: [
        { label: "A", slope: 1.6, intercept: 0.5, r2: 0.96 },
        { label: "B", slope: 1.6, intercept: 1.5, r2: 0.96 },
    ],
    regressionSkipped: false,
    xMin: 1,
    xMax: 4,
    yMin: 2,
    yMax: 8,
};

const aggregateXYPlotMock = vi.fn(
    (_rows: PrivateRows, _mapping: Mapping, options: { computeRegression: boolean }) => {
        if (!options.computeRegression) {
            return {
                ...xyRegressionFixture,
                regressions: [],
            };
        }

        return xyRegressionFixture;
    },
);

vi.mock("@/lib/chartSpec/aggregators/xyPlot", () => ({
    aggregateXYPlot: (
        rows: PrivateRows,
        mapping: Mapping,
        options: { computeRegression: boolean },
    ) => aggregateXYPlotMock(rows, mapping, options),
}));

vi.mock("@/lib/chartSpec/aggregators/longitudinalAggregator", () => ({
    aggregateLongitudinal: vi.fn(),
}));

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

const sampleReceipt = (): Receipt => ({
    alternatives: [],
    intent: "Compare smoking groups",
    overrides: [],
    recommendation: {
        because: "Because body.",
        becauseTitle: "Because",
        chartName: "XY scatter",
        handles: "Handles body.",
        handlesTitle: "Handles",
        headline: "Add regression lines for each smoking group",
    },
    selectionMode: "ai",
    tests: [],
    testsTitle: "Tests",
    transformations: [{ chart: "scatter plot.", verb: "becomes a" }],
});

const datasetWithRows: LoupeDataset = {
    inferences: [],
    rows: brandRows(
        Array.from({ length: 20 }, (_, index) => ({
            arm: index < 10 ? "never" : "current",
            x: String(index + 1),
            y: String((index + 1) * 2),
        })),
    ),
};

const advanceToChartPhase = async (): Promise<void> => {
    await act(async () => {
        vi.advanceTimersByTime(700);
    });
};

describe("Recommendation XY regression", () => {
    let bboxSpy: ReturnType<typeof vi.spyOn> | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback): number => {
            cb(0);
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", (): void => undefined);
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
        aggregateXYPlotMock.mockClear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.useRealTimers();
        bboxSpy?.mockRestore();
        cleanup();
    });

    it("renders regression lines on a recommended XY scatter (default-on behavior)", async () => {
        const spec = createDefaultChartSpec("xy", {
            id: "spec-xy-regression",
            createdAt: "2026-05-20T10:00:00.000Z",
        });

        render(
            <Recommendation
                chartKind="xy"
                dataset={datasetWithRows}
                fromCache={false}
                receipt={sampleReceipt()}
                spec={spec}
            />,
        );

        await advanceToChartPhase();

        expect(aggregateXYPlotMock).toHaveBeenCalledWith(
            datasetWithRows.rows,
            defaultMapping,
            { computeRegression: true },
        );

        await act(async () => {
            await Promise.resolve();
        });

        vi.useRealTimers();
        await waitFor(() => {
            const regressionLines = document.querySelectorAll('[data-role="xy-regression"]');
            expect(regressionLines).toHaveLength(2);

            const r2Labels = document.querySelectorAll('[data-role="xy-regression-label"]');
            expect(r2Labels).toHaveLength(2);
            expect(r2Labels[0]?.textContent).toMatch(/^r²\s*=\s*0\.96$/);
        });
    });
});
