// @vitest-environment happy-dom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";

import { AppStateProvider, useAppState } from "@/app/providers";
import type { Receipt } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";
import type { BarErrorAggregation } from "@/lib/chartSpec/aggregators/barError.types";
import type { Mapping } from "@/lib/roles/types";
import type { PrivateRows } from "@/lib/parser/types";

import { RecommendGate } from "../RecommendGate";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: (): { replace: typeof replace } => ({ replace }),
}));

vi.mock("@/components/charts/PublicationKM", () => ({
    PublicationKM: (): JSX.Element => <div data-testid="publication-km">Publication KM</div>,
}));

vi.mock("../recommendation/RecommendationAiPending", () => ({
    RecommendationAiPending: (): null => null,
}));

const aggregateBarErrorMock = vi.fn(
    (_rows: PrivateRows, _mapping: Mapping): BarErrorAggregation => ({
        groups: [{ label: "A", mean: 10, sd: 1, n: 5 }],
        missing: {
            dropRate: 0,
            droppedRows: 0,
            missingGroupRows: 0,
            missingOutcomeRows: 0,
            totalRows: 5,
        },
    }),
);

vi.mock("@/lib/chartSpec/aggregators/barError", () => ({
    aggregateBarError: (rows: PrivateRows, mapping: Mapping) =>
        aggregateBarErrorMock(rows, mapping),
}));

vi.mock("@/lib/chartSpec/aggregators/kaplanMeier", () => ({
    aggregateKaplanMeier: () => ({
        kind: "km",
        tMax: 30,
        groups: [
            {
                atRiskTicks: [{ nAtRisk: 10, t: 0 }],
                label: "A",
                nEvents: 1,
                nTotal: 10,
                points: [{ censored: false, ciLower: 0.8, ciUpper: 1, nAtRisk: 10, survival: 1, t: 0 }],
            },
        ],
    }),
}));

vi.mock("@/components/charts/d3/BarErrorChart", () => ({
    BarErrorChart: (): JSX.Element => <div data-testid="bar-error-chart">Bar with errors</div>,
}));

vi.mock("@/components/charts/d3/KaplanMeierChart", () => ({
    KaplanMeierChart: (): JSX.Element => <div data-testid="km-chart">Kaplan–Meier chart</div>,
}));

const receiptWithBarAlt = (): Receipt => ({
    alternatives: [
        {
            name: "Bar with error bars",
            reason: "Better when there is no time axis.",
            slug: "barError",
        },
    ],
    intent: "Compare survival",
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

const SeedAndGate = (): JSX.Element => {
    const {
        appendOverride,
        hydrated,
        setChartKind,
        setDataset,
        setIntent,
        setMapping,
        setReceipt,
        setSelectionMode,
    } = useAppState();

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        setSelectionMode("ai");
        setIntent("Compare survival");
        setReceipt(receiptWithBarAlt());
        setChartKind("km");
        setDataset([], brandRows([{ time: "1", event: "1", arm: "A", value: "10" }]));
        setMapping({ time: "time", event: "event", group: "arm", outcome: "value" });
    }, [hydrated, setChartKind, setDataset, setIntent, setMapping, setReceipt, setSelectionMode]);

    return (
        <>
            <button
                type="button"
                data-testid="use-instead"
                onClick={() => {
                    appendOverride({
                        at: new Date().toISOString(),
                        from: "km",
                        to: "barError",
                    });
                }}
            >
                Use instead
            </button>
            <RecommendGate />
        </>
    );
};

afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
    replace.mockClear();
});

beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
});

describe("RecommendGate Use instead", () => {
    it("renders live bar chart after override, not publication KM mock", async () => {
        render(
            <AppStateProvider>
                <SeedAndGate />
            </AppStateProvider>,
        );

        await act(async () => {
            vi.advanceTimersByTime(1100);
        });

        expect(screen.getByTestId("km-chart")).toBeTruthy();
        expect(screen.queryByTestId("publication-km")).toBeNull();

        vi.useRealTimers();

        fireEvent.click(screen.getByTestId("use-instead"));

        expect(await screen.findByTestId("bar-error-chart")).toBeTruthy();
        expect(screen.queryByTestId("publication-km")).toBeNull();
        expect(screen.queryByTestId("km-chart")).toBeNull();
    });
});
