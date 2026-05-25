// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LoupeDataset } from "@/app/providers";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { ChartSpec, OverrideEvent, Receipt } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import type { PrivateRows } from "@/lib/parser/types";
import type { BarErrorAggregation } from "@/lib/chartSpec/aggregators/barError.types";
import type { BoxPlotData } from "@/lib/chartSpec/aggregators/boxPlot.types";
import { BoxPlotError } from "@/lib/chartSpec/aggregators/boxPlot.types";
import { KaplanMeierError } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import { XYPlotError } from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { Mapping } from "@/lib/roles/types";

import * as barErrorMappingModule from "../recommendation/barErrorMapping";
import { Recommendation } from "../Recommendation";

const push = vi.fn();
const replace = vi.fn();
const appendOverride = vi.fn();
const setSelectionMode = vi.fn();
const setChartSpec = vi.fn();
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
        setChartSpec: typeof setChartSpec;
        setSelectionMode: typeof setSelectionMode;
        updateLatestOverrideReason: typeof updateLatestOverrideReason;
    } => ({
        appendOverride,
        intent: "",
        mapping: defaultMapping,
        setChartSpec,
        setSelectionMode,
        updateLatestOverrideReason,
    }),
}));

vi.mock("@/components/charts/PublicationKM", () => ({
    PublicationKM: (): JSX.Element => <div data-testid="publication-km">Kaplan–Meier</div>,
}));

const aggregateBarErrorMock = vi.fn(
    (_rows: PrivateRows, _mapping: Mapping): BarErrorAggregation => ({
        groups: [{ label: "A", mean: 10, sd: 1, n: 5 }],
        missing: {
            dropRate: 0.1,
            droppedRows: 1,
            missingGroupRows: 0,
            missingOutcomeRows: 1,
            totalRows: 10,
        },
    }),
);

vi.mock("@/lib/chartSpec/aggregators/barError", () => ({
    aggregateBarError: (rows: PrivateRows, mapping: Mapping) =>
        aggregateBarErrorMock(rows, mapping),
}));

vi.mock("@/lib/chartSpec/aggregators/kaplanMeier", () => ({
    aggregateKaplanMeier: (rows: PrivateRows, mapping: Mapping) =>
        aggregateKaplanMeierMock(rows, mapping),
}));

vi.mock("@/components/charts/d3/BarErrorChart", () => ({
    BarErrorChart: (): JSX.Element => <div data-testid="bar-error-chart">Bar with errors</div>,
}));

vi.mock("@/components/charts/d3/KaplanMeierChart", () => ({
    KaplanMeierChart: (): JSX.Element => <div data-testid="km-chart">Kaplan–Meier chart</div>,
}));

vi.mock("@/lib/chartSpec/aggregators/boxPlot", () => ({
    aggregateBoxPlot: (rows: PrivateRows, mapping: Mapping) =>
        aggregateBoxPlotMock(rows, mapping),
}));

vi.mock("@/components/charts/d3/BoxChart", () => ({
    BoxChart: (): JSX.Element => <div data-testid="box-chart">Box plot chart</div>,
}));

const xyPlotFixture = {
    kind: "xy" as const,
    groups: [{ label: "A", points: [{ x: 1, y: 2 }] }],
    regressions: [] as const,
    regressionSkipped: false,
    xMin: 1,
    xMax: 1,
    yMin: 2,
    yMax: 2,
};

const aggregateXYPlotMock = vi.fn(
    (_rows: PrivateRows, _mapping: Mapping, _options: { computeRegression: boolean }) =>
        xyPlotFixture,
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

vi.mock("@/components/charts/d3/XYChart", () => ({
    XYChart: (): JSX.Element => <div data-testid="xy-chart">XY plot chart</div>,
}));

const boxPlotFixture: BoxPlotData = {
    kind: "box",
    yMin: 1,
    yMax: 5,
    groups: [
        {
            kind: "box",
            label: "A",
            n: 10,
            min: 1,
            q1: 2,
            median: 3,
            q3: 4,
            max: 5,
            mean: 3,
            outliers: [],
            notchLower: 2.5,
            notchUpper: 3.5,
        },
    ],
};

const aggregateBoxPlotMock = vi.fn((_rows: PrivateRows, _mapping: Mapping) => boxPlotFixture);

const aggregateKaplanMeierMock = vi.fn((_rows: PrivateRows, _mapping: Mapping) => ({
    groups: [
        {
            atRiskTicks: [{ nAtRisk: 10, t: 0 }],
            label: "A",
            nEvents: 1,
            nTotal: 10,
            points: [
                {
                    censored: false,
                    ciLower: 0.8,
                    ciUpper: 1,
                    nAtRisk: 10,
                    survival: 1,
                    t: 0,
                },
            ],
        },
    ],
    kind: "km" as const,
    tMax: 30,
}));

const emptyDataset: LoupeDataset = {
    inferences: [],
    rows: brandRows([]),
};

const chartRenderProps = (
    chartKind: ChartSpec["kind"],
    receipt: Receipt,
    fromCache = false,
    dataset: LoupeDataset = emptyDataset,
) => ({
    chartKind,
    dataset,
    fromCache,
    receipt,
    spec: createDefaultChartSpec(chartKind, {
        id: "spec-test",
        createdAt: "2026-05-20T10:00:00.000Z",
    }),
});

const sampleReceipt = (overrides: readonly OverrideEvent[] = []): Receipt => ({
    alternatives: [],
    intent: "Compare arms",
    overrides,
    recommendation: {
        because: "Because body.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier",
        handles: "Handles body.",
        handlesTitle: "Handles",
        headline: "Headline.",
    },
    selectionMode: "ai",
    tests: [{ label: "Log-rank" }],
    testsTitle: "Tests",
    transformations: [{ chart: "KM curve.", verb: "becomes a" }],
});

const receiptWithBarAlt = (overrides: readonly OverrideEvent[] = []): Receipt => ({
    ...sampleReceipt(overrides),
    alternatives: [
        {
            name: "Bar with error bars",
            reason: "Better when there is no time axis.",
            slug: "barError",
        },
    ],
});

const advanceToChartPhase = async (): Promise<void> => {
    await act(async () => {
        vi.advanceTimersByTime(700);
    });
};

const advanceToWhyPhase = async (): Promise<void> => {
    await act(async () => {
        vi.advanceTimersByTime(1100);
    });
};

describe("Recommendation", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        appendOverride.mockClear();
        setSelectionMode.mockClear();
        updateLatestOverrideReason.mockClear();
        aggregateBarErrorMock.mockClear();
        aggregateBoxPlotMock.mockClear();
        aggregateKaplanMeierMock.mockClear();
        aggregateXYPlotMock.mockClear();
        aggregateXYPlotMock.mockImplementation(() => xyPlotFixture);
        aggregateBoxPlotMock.mockImplementation(() => boxPlotFixture);
        aggregateKaplanMeierMock.mockImplementation((_rows: PrivateRows, _mapping: Mapping) => ({
            groups: [
                {
                    atRiskTicks: [{ nAtRisk: 10, t: 0 }],
                    label: "A",
                    nEvents: 1,
                    nTotal: 10,
                    points: [
                        {
                            censored: false,
                            ciLower: 0.8,
                            ciUpper: 1,
                            nAtRisk: 10,
                            survival: 1,
                            t: 0,
                        },
                    ],
                },
            ],
            kind: "km" as const,
            tMax: 30,
        }));
        push.mockClear();
        replace.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        cleanup();
    });

    it("renders receipt sections", () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        expect(document.body.textContent).toContain("Compare arms");
        expect(screen.getByText("Headline.")).toBeTruthy();
        expect(screen.getByText(/Log-rank/)).toBeTruthy();
    });

    it("shows cached badge only when fromCache is true", () => {
        const { rerender } = render(
            <Recommendation {...chartRenderProps("km", sampleReceipt())} />,
        );
        expect(screen.queryByText(/cached · instant/i)).toBeNull();
        rerender(<Recommendation {...chartRenderProps("km", sampleReceipt(), true)} />);
        expect(screen.getByText(/cached · instant/i)).toBeTruthy();
    });

    it("runs phase timers: dissolve, chart reveal, then why panel", async () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        const intentRoot = document.querySelector(".rec-intent");
        expect(intentRoot).not.toBeNull();
        const firstWord = intentRoot?.querySelector(".rec-word");
        expect(firstWord?.className.includes("dissolving")).toBe(false);

        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        expect(firstWord?.className.includes("dissolving")).toBe(true);

        await act(async () => {
            vi.advanceTimersByTime(500);
        });
        expect(document.querySelector(".rec-chart-reveal")).toBeTruthy();

        await act(async () => {
            vi.advanceTimersByTime(400);
        });
        expect(document.querySelector(".rec-why-stage.is-visible")).toBeTruthy();
    });

    it("does not update phase after unmount mid-sequence", async () => {
        const err = vi.spyOn(console, "error").mockImplementation(() => {});
        const { unmount } = render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await act(async () => {
            vi.advanceTimersByTime(500);
        });
        unmount();
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });
        expect(err).not.toHaveBeenCalled();
        err.mockRestore();
    });

    it("renders KaplanMeierChart for km after chart phase", async () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByTestId("km-chart")).toBeTruthy();
        expect(screen.queryByTestId("publication-km")).toBeNull();
    });

    it("shows palette selector beside chart after chart phase", async () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByRole("listbox", { name: /chart palette/i })).toBeTruthy();
        expect(screen.getAllByRole("option")).toHaveLength(7);
    });

    it("shows KaplanMeierError message when more than 4 groups", async () => {
        aggregateKaplanMeierMock.mockImplementation(() => {
            throw new KaplanMeierError("Max 4 groups supported. Received 5.");
        });
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByRole("alert").textContent).toContain("Max 4 groups supported");
    });

    it("renders BoxChart for box after chart phase", async () => {
        render(<Recommendation {...chartRenderProps("box", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByTestId("box-chart")).toBeTruthy();
        expect(screen.queryByText(/Box plot renderer coming soon/i)).toBeNull();
    });

    it("shows BoxPlotError message when more than 4 groups", async () => {
        aggregateBoxPlotMock.mockImplementation(() => {
            throw new BoxPlotError("Max 4 groups supported. Received 5.");
        });
        render(<Recommendation {...chartRenderProps("box", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByRole("alert").textContent).toContain("Max 4 groups supported");
    });

    it("shows XYPlotError message when more than 4 groups", async () => {
        aggregateXYPlotMock.mockImplementation(() => {
            throw new XYPlotError("Max 4 groups supported. Received 5.");
        });
        render(<Recommendation {...chartRenderProps("xy", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByRole("alert").textContent).toMatch(/max.*4.*groups/i);
    });

    it("does not show override badge when overrides is empty", async () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("shows override badge with aria-label when overrides are present", async () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "box" },
            { at: "2026-05-19T14:25:00.000Z", from: "box", to: "xy" },
        ];
        render(
            <Recommendation {...chartRenderProps("xy", sampleReceipt(overrides))} />,
        );
        await advanceToChartPhase();
        const badge = screen.getByRole("status", { name: /Chart overridden/i });
        expect(badge.textContent).toContain("Overridden by you");
        expect(badge.getAttribute("aria-label")).toContain("KM → Box");
        expect(badge.getAttribute("aria-label")).toContain("Box → XY");
        expect(badge.getAttribute("aria-label")).toMatch(/at \d{2}:\d{2}/);
    });

    it("calls appendOverride when selecting a different chart in the override shell", async () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await advanceToChartPhase();
        fireEvent.click(screen.getByRole("button", { name: /Try a different chart/i }));
        fireEvent.click(screen.getByRole("button", { name: /Box plot/i }));
        expect(appendOverride).toHaveBeenCalledTimes(1);
        expect(appendOverride.mock.calls[0]?.[0]).toMatchObject({ from: "km", to: "box" });
        expect(appendOverride.mock.calls[0]?.[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(push).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();
    });

    it("calls appendOverride with reason when clicking Use instead on an alternative", async () => {
        render(
            <Recommendation {...chartRenderProps("km", receiptWithBarAlt())} />,
        );
        await advanceToWhyPhase();
        fireEvent.click(screen.getByRole("button", { name: /Use instead/i }));
        expect(appendOverride).toHaveBeenCalledTimes(1);
        expect(appendOverride).toHaveBeenCalledWith(
            expect.objectContaining({
                from: "km",
                to: "barError",
            }),
        );
        expect(appendOverride.mock.calls[0]?.[0].reason).toBeUndefined();
        expect(appendOverride.mock.calls[0]?.[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("does not call appendOverride when selecting the current chart", async () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await advanceToChartPhase();
        fireEvent.click(screen.getByRole("button", { name: /Try a different chart/i }));
        fireEvent.click(screen.getByRole("button", { name: /Kaplan–Meier/i }));
        expect(appendOverride).not.toHaveBeenCalled();
    });

    it("updates placeholder and badge after override via rerender", async () => {
        const { rerender } = render(
            <Recommendation {...chartRenderProps("km", sampleReceipt())} />,
        );
        await advanceToChartPhase();
        fireEvent.click(screen.getByRole("button", { name: /Try a different chart/i }));
        fireEvent.click(screen.getByRole("button", { name: /Box plot/i }));
        const event: OverrideEvent = {
            at: "2026-05-19T14:23:00.000Z",
            from: "km",
            to: "box",
        };
        rerender(
            <Recommendation {...chartRenderProps("box", sampleReceipt([event]))} />,
        );
        expect(screen.getByTestId("box-chart")).toBeTruthy();
        expect(screen.getByRole("status", { name: /Chart overridden/i })).toBeTruthy();
    });

    it("appends a second override when switching back to the original kind", async () => {
        const first: OverrideEvent = {
            at: "2026-05-19T14:23:00.000Z",
            from: "km",
            to: "box",
        };
        const { rerender } = render(
            <Recommendation {...chartRenderProps("box", sampleReceipt([first]))} />,
        );
        await advanceToChartPhase();
        fireEvent.click(screen.getByRole("button", { name: /Try a different chart/i }));
        fireEvent.click(screen.getByRole("button", { name: /Kaplan–Meier/i }));
        expect(appendOverride).toHaveBeenCalledWith(
            expect.objectContaining({ from: "box", to: "km" }),
        );
        const second: OverrideEvent = {
            at: "2026-05-19T14:25:00.000Z",
            from: "box",
            to: "km",
        };
        rerender(
            <Recommendation {...chartRenderProps("km", sampleReceipt([first, second]))} />,
        );
        expect(screen.queryByRole("status", { name: /Chart overridden/i })).toBeNull();
        expect(document.querySelector(".rec-chart-title")?.textContent).toBe("Kaplan–Meier");
    });

    it("shows AI chart name as title when overrides is empty", () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        expect(document.querySelector(".rec-chart-title")?.textContent).toBe("Kaplan–Meier");
        expect(document.body.textContent).not.toContain("overridden from");
    });

    it("shows composite title when display-overridden", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
        ];
        render(
            <Recommendation {...chartRenderProps("barError", sampleReceipt(overrides))} />,
        );
        const title = document.querySelector(".rec-chart-title")?.textContent ?? "";
        expect(title).toContain("Bar chart with error bars");
        expect(title).toContain("overridden from Kaplan-Meier");
    });

    it("shows override reason textarea when display-overridden", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
        ];
        render(
            <Recommendation {...chartRenderProps("barError", sampleReceipt(overrides))} />,
        );
        const textarea = screen.getByPlaceholderText(/note your reasoning/i);
        expect(textarea).toBeTruthy();
        expect((textarea as HTMLTextAreaElement).value).toBe("");
    });

    it("calls updateLatestOverrideReason when typing override reason", async () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
        ];
        const { rerender } = render(
            <Recommendation {...chartRenderProps("barError", sampleReceipt(overrides))} />,
        );
        const textarea = screen.getByPlaceholderText(/note your reasoning/i);
        fireEvent.change(textarea, { target: { value: "I prefer comparing means" } });
        expect(updateLatestOverrideReason).toHaveBeenCalledWith("I prefer comparing means");

        const updated: OverrideEvent[] = [
            {
                at: "2026-05-19T14:23:00.000Z",
                from: "km",
                reason: "I prefer comparing means",
                to: "barError",
            },
        ];
        rerender(
            <Recommendation {...chartRenderProps("barError", sampleReceipt(updated))} />,
        );
        expect((screen.getByPlaceholderText(/note your reasoning/i) as HTMLTextAreaElement).value).toBe(
            "I prefer comparing means",
        );
    });

    it("composite title uses first override source as original kind", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
            { at: "2026-05-19T14:25:00.000Z", from: "barError", to: "box" },
        ];
        render(<Recommendation {...chartRenderProps("box", sampleReceipt(overrides))} />);
        const title = document.querySelector(".rec-chart-title")?.textContent ?? "";
        expect(title).toContain("Box plot");
        expect(title).toContain("overridden from Kaplan-Meier");
        expect(title).not.toContain("overridden from Bar chart");
    });

    it("applies historical rationale class when display-overridden", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
        ];
        render(
            <Recommendation {...chartRenderProps("barError", sampleReceipt(overrides))} />,
        );
        expect(document.querySelector(".rec-rationale--historical")).toBeTruthy();
    });

    it("override reason textarea respects maxLength of 500", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
        ];
        render(
            <Recommendation {...chartRenderProps("barError", sampleReceipt(overrides))} />,
        );
        const textarea = screen.getByPlaceholderText(/note your reasoning/i) as HTMLTextAreaElement;
        expect(textarea.maxLength).toBe(500);
        fireEvent.change(textarea, { target: { value: "x".repeat(501) } });
        expect(updateLatestOverrideReason).toHaveBeenCalledWith("x".repeat(500));
    });

    it("shows missing-data warning when drop rate exceeds 5%", async () => {
        render(
            <Recommendation
                {...chartRenderProps("barError", sampleReceipt())}
            />,
        );
        await advanceToChartPhase();
        expect(screen.getByRole("status").textContent).toMatch(/rows dropped/i);
    });

    it("hides missing-data warning when drop rate is below 5%", async () => {
        aggregateBarErrorMock.mockReturnValue({
            groups: [],
            missing: {
                dropRate: 0.03,
                droppedRows: 1,
                missingGroupRows: 0,
                missingOutcomeRows: 1,
                totalRows: 10,
            },
        });
        render(
            <Recommendation {...chartRenderProps("barError", sampleReceipt())} />,
        );
        await advanceToChartPhase();
        expect(screen.queryByText(/rows dropped/i)).toBeNull();
    });

    it("hides missing-data warning when drop rate is exactly 5%", async () => {
        aggregateBarErrorMock.mockReturnValue({
            groups: [{ label: "A", mean: 1, sd: 0, n: 19 }],
            missing: {
                dropRate: 0.05,
                droppedRows: 1,
                missingGroupRows: 0,
                missingOutcomeRows: 1,
                totalRows: 20,
            },
        });
        render(<Recommendation {...chartRenderProps("barError", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.queryByText(/rows dropped/i)).toBeNull();
    });

    it("shows inferred outcome breadcrumb when outcome was guessed", async () => {
        vi.spyOn(barErrorMappingModule, "mappingForBarError").mockReturnValue({
            mapping: { group: "arm", outcome: "bp_change" },
            inferredOutcome: "bp_change",
        });
        render(<Recommendation {...chartRenderProps("barError", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByText(/Outcome column inferred/i)).toBeTruthy();
        expect(screen.getByText("bp_change")).toBeTruthy();
    });

    it("renders customization rail with bar error controls on recommend", async () => {
        render(<Recommendation {...chartRenderProps("barError", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByRole("complementary", { name: /customize chart/i })).toBeTruthy();
        expect(screen.getByLabelText("Error bar type")).toBeTruthy();
        expect(screen.getByText(/edit inline/i)).toBeTruthy();
    });

    it("keeps the override workflow on recommend", async () => {
        render(<Recommendation {...chartRenderProps("km", receiptWithBarAlt())} />);
        await act(async () => {
            vi.advanceTimersByTime(1100);
        });
        expect(screen.getByRole("button", { name: /Use instead/i })).toBeTruthy();
    });

    it("shows error bars unavailable when all groups have n<2", async () => {
        aggregateBarErrorMock.mockReturnValue({
            groups: [
                { label: "A", mean: 10, sd: 0, n: 1 },
                { label: "B", mean: 12, sd: 0, n: 1 },
            ],
            missing: {
                dropRate: 0,
                droppedRows: 0,
                missingGroupRows: 0,
                missingOutcomeRows: 0,
                totalRows: 2,
            },
        });
        render(<Recommendation {...chartRenderProps("barError", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByText(/at least 2 rows per group/i)).toBeTruthy();
    });

    it("treats back-to-original kind as not display-overridden", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
            { at: "2026-05-19T14:25:00.000Z", from: "barError", to: "km" },
        ];
        render(<Recommendation {...chartRenderProps("km", sampleReceipt(overrides))} />);
        expect(document.querySelector(".rec-chart-title")?.textContent).toBe("Kaplan–Meier");
        expect(document.body.textContent).not.toContain("overridden from");
        expect(screen.queryByPlaceholderText(/note your reasoning/i)).toBeNull();
        expect(screen.queryByRole("status", { name: /Chart overridden/i })).toBeNull();
    });
});
