// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LoupeDataset } from "@/app/providers";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { ChartSpec, OverrideEvent, Receipt } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { Recommendation } from "../Recommendation";

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

const defaultMapping: Mapping = { group: "arm", outcome: "value" };

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

const aggregateBarErrorMock = vi.fn(() => ({
    groups: [{ label: "A", mean: 10, sd: 1, n: 5 }],
    missing: {
        dropRate: 0.1,
        droppedRows: 1,
        missingGroupRows: 0,
        missingOutcomeRows: 1,
        totalRows: 10,
    },
}));

vi.mock("@/lib/chartSpec/aggregators/barError", () => ({
    aggregateBarError: (...args: unknown[]) => aggregateBarErrorMock(...args),
}));

vi.mock("@/components/charts/d3/BarErrorChart", () => ({
    BarErrorChart: (): JSX.Element => <div data-testid="bar-error-chart">Bar with errors</div>,
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
        push.mockClear();
        replace.mockClear();
    });

    afterEach(() => {
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

    it("renders PublicationKM for km after chart phase", async () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.getByTestId("publication-km")).toBeTruthy();
        expect(screen.queryByText(/renderer coming soon/i)).toBeNull();
    });

    it("renders PlaceholderRenderer for non-km kinds after chart phase", async () => {
        render(<Recommendation {...chartRenderProps("box", sampleReceipt())} />);
        await advanceToChartPhase();
        expect(screen.queryByTestId("publication-km")).toBeNull();
        expect(screen.getByText(/Box plot renderer coming soon/i)).toBeTruthy();
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
        expect(screen.getByText(/Box plot renderer coming soon/i)).toBeTruthy();
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
        expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Kaplan–Meier");
    });

    it("shows AI chart name as title when overrides is empty", () => {
        render(<Recommendation {...chartRenderProps("km", sampleReceipt())} />);
        expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Kaplan–Meier");
        expect(document.body.textContent).not.toContain("overridden from");
    });

    it("shows composite title when display-overridden", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
        ];
        render(
            <Recommendation {...chartRenderProps("barError", sampleReceipt(overrides))} />,
        );
        const title = screen.getByRole("heading", { level: 3 }).textContent ?? "";
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
        const title = screen.getByRole("heading", { level: 3 }).textContent ?? "";
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

    it("hides missing-data warning when drop rate is at most 5%", async () => {
        aggregateBarErrorMock.mockReturnValueOnce({
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

    it("initializes error toggle from receipt hints", async () => {
        const receipt: Receipt = {
            ...sampleReceipt(),
            tests: [{ label: "Independent samples t-test", name: "95% CI" }],
        };
        render(<Recommendation {...chartRenderProps("barError", receipt)} />);
        await advanceToChartPhase();
        expect((screen.getByRole("radio", { name: /95% CI/ }) as HTMLInputElement).checked).toBe(
            true,
        );
    });

    it("initializes error toggle to SEM when receipt has no error hint", async () => {
        render(<Recommendation {...chartRenderProps("barError", sampleReceipt())} />);
        await advanceToChartPhase();
        expect((screen.getByRole("radio", { name: /SEM/ }) as HTMLInputElement).checked).toBe(
            true,
        );
    });

    it("shows error bars unavailable when all groups have n<2", async () => {
        aggregateBarErrorMock.mockReturnValueOnce({
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

    it("does not re-aggregate when error type toggle changes", async () => {
        render(<Recommendation {...chartRenderProps("barError", sampleReceipt())} />);
        await advanceToChartPhase();
        const callsAfterMount = aggregateBarErrorMock.mock.calls.length;
        expect(callsAfterMount).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole("radio", { name: /SD Standard/ }));
        expect(aggregateBarErrorMock.mock.calls.length).toBe(callsAfterMount);
    });

    it("treats back-to-original kind as not display-overridden", () => {
        const overrides: OverrideEvent[] = [
            { at: "2026-05-19T14:23:00.000Z", from: "km", to: "barError" },
            { at: "2026-05-19T14:25:00.000Z", from: "barError", to: "km" },
        ];
        render(<Recommendation {...chartRenderProps("km", sampleReceipt(overrides))} />);
        expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Kaplan–Meier");
        expect(document.body.textContent).not.toContain("overridden from");
        expect(screen.queryByPlaceholderText(/note your reasoning/i)).toBeNull();
        expect(screen.queryByRole("status", { name: /Chart overridden/i })).toBeNull();
    });
});
