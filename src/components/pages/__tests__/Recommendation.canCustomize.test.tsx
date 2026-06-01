// @vitest-environment happy-dom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LoupeDataset } from "@/app/providers";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import type { BarErrorAggregation } from "@/lib/chartSpec/aggregators/barError.types";
import type { Mapping } from "@/lib/roles/types";

import { Recommendation } from "../Recommendation";

const push = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: (): { push: typeof push } => ({ push }),
}));

const defaultMapping: Mapping = {
    event: "event",
    group: "arm",
    outcome: "value",
    time: "time",
    x: "x",
    y: "y",
};

let chartSpecState: ChartSpec | null = createDefaultChartSpec("km", {
    id: "spec-can-customize",
    createdAt: "2026-06-01T10:00:00.000Z",
});

vi.mock("@/app/providers", () => ({
    useAppState: (): {
        appendOverride: ReturnType<typeof vi.fn>;
        chartSpec: ChartSpec | null;
        intent: string;
        mapping: Mapping;
        setSelectionMode: ReturnType<typeof vi.fn>;
        updateLatestOverrideReason: ReturnType<typeof vi.fn>;
    } => ({
        appendOverride: vi.fn(),
        chartSpec: chartSpecState,
        intent: "",
        mapping: defaultMapping,
        setSelectionMode: vi.fn(),
        updateLatestOverrideReason: vi.fn(),
    }),
}));

const aggregateBarErrorMock = vi.fn(
    (): BarErrorAggregation => ({
        groups: [],
        missing: {
            dropRate: 0,
            droppedRows: 0,
            missingGroupRows: 0,
            missingOutcomeRows: 0,
            totalRows: 0,
        },
    }),
);

vi.mock("@/lib/chartSpec/aggregators/barError", () => ({
    aggregateBarError: () => aggregateBarErrorMock(),
}));

vi.mock("@/lib/chartSpec/aggregators/kaplanMeier", () => ({
    aggregateKaplanMeier: vi.fn(() => ({
        curves: [{ label: "A", points: [{ censored: false, ciLower: 0.8, ciUpper: 1, nAtRisk: 10, survival: 1, t: 0 }] }],
        kind: "km" as const,
        tMax: 30,
    })),
}));

vi.mock("@/components/charts/d3/KaplanMeierChart", () => ({
    KaplanMeierChart: (): JSX.Element => <div data-testid="km-chart">KM</div>,
}));

const emptyDataset: LoupeDataset = {
    inferences: [],
    rows: brandRows([]),
};

const sampleReceipt = (): Receipt => ({
    alternatives: [],
    intent: "Compare arms",
    overrides: [],
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

const advanceToChartPhase = async (): Promise<void> => {
    await act(async () => {
        vi.advanceTimersByTime(700);
    });
};

const renderKm = (spec: ChartSpec): void => {
    render(
        <Recommendation
            chartKind="km"
            dataset={emptyDataset}
            fromCache={false}
            receipt={sampleReceipt()}
            spec={spec}
        />,
    );
};

// MUTATION-VERIFY (null guard): canCustomize.ts line 20 `return false` → `return true`.
// Tests "disables Customize button when chartSpec is null" and
// "shows mapping-incomplete alert when chartSpec is null" go RED.
// Verified manually: 2026-06-01. REVERTED.
//
// MUTATION-VERIFY (enabled path): canCustomize.ts line 40 final `return false` → `return true`
// only (remove kind branches). Test "enables Customize button when chartSpec is non-null
// and mapping is complete" goes RED when km branch is bypassed — use: replace entire body
// with `return false`. Verified manually: 2026-06-01. REVERTED.

describe("Recommendation — canCustomize gate", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        chartSpecState = createDefaultChartSpec("km", {
            id: "spec-can-customize",
            createdAt: "2026-06-01T10:00:00.000Z",
        });
        push.mockClear();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("does not show mapping alert during chart reveal animation (phase < 2)", () => {
        chartSpecState = createDefaultChartSpec("km", {
            id: "spec-can-customize",
            createdAt: "2026-06-01T10:00:00.000Z",
        });
        renderKm(chartSpecState);

        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("disables Customize button when chartSpec is null", async () => {
        chartSpecState = null;
        renderKm(
            createDefaultChartSpec("km", {
                id: "orphan-spec",
                createdAt: "2026-06-01T10:00:00.000Z",
            }),
        );
        await advanceToChartPhase();

        const button = screen.getByRole("button", { name: /customize/i });
        expect(button).toHaveProperty("disabled", true);
        expect(push).not.toHaveBeenCalled();
    });

    it("shows mapping-incomplete alert when chartSpec is null", async () => {
        chartSpecState = null;
        renderKm(
            createDefaultChartSpec("km", {
                id: "orphan-spec",
                createdAt: "2026-06-01T10:00:00.000Z",
            }),
        );
        await advanceToChartPhase();

        expect(screen.getByRole("alert")).not.toBeNull();
    });

    it("disables Customize when barError has no plottable groups", async () => {
        chartSpecState = createDefaultChartSpec("barError", {
            id: "spec-bar-empty",
            createdAt: "2026-06-01T10:00:00.000Z",
        });
        render(
            <Recommendation
                chartKind="barError"
                dataset={emptyDataset}
                fromCache={false}
                receipt={sampleReceipt()}
                spec={chartSpecState}
            />,
        );
        await advanceToChartPhase();

        expect(screen.getByRole("button", { name: /customize/i })).toHaveProperty("disabled", true);
        expect(screen.getByRole("alert")).not.toBeNull();
    });

    it("enables Customize button when chartSpec is non-null and mapping is complete", async () => {
        chartSpecState = createDefaultChartSpec("km", {
            id: "spec-can-customize",
            createdAt: "2026-06-01T10:00:00.000Z",
        });
        renderKm(chartSpecState);
        await advanceToChartPhase();

        const button = screen.getByRole("button", { name: /customize/i });
        expect(button).toHaveProperty("disabled", false);
    });
});
