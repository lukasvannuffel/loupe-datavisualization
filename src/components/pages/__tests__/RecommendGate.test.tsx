// @vitest-environment happy-dom

import { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider, useAppState } from "@/app/providers";
import type { Receipt } from "@/lib/chartSpec/types";
import { brandRows } from "@/lib/parser/types";

import { RecommendGate } from "../RecommendGate";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: (): { replace: typeof replace } => ({ replace }),
}));

vi.mock("../Recommendation", () => ({
    Recommendation: (): JSX.Element => <div data-testid="recommendation-page" />,
}));

const sampleReceipt = (): Receipt => ({
    alternatives: [],
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

const RecommendGateHarness = (): JSX.Element => {
    const { chartSpec, hydrated, setChartKind, setDataset, setMapping, setReceipt } = useAppState();

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        setReceipt(sampleReceipt());
        setChartKind("km");
        setDataset([], brandRows([{ time: "1", event: "1", arm: "A" }]));
        setMapping({ time: "time", event: "event", group: "arm" });
    }, [hydrated, setChartKind, setDataset, setMapping, setReceipt]);

    return (
        <>
            <span data-testid="chart-spec-kind">{chartSpec?.kind ?? "none"}</span>
            <RecommendGate />
        </>
    );
};

afterEach(() => {
    window.sessionStorage.clear();
    replace.mockClear();
});

beforeEach(() => {
    window.sessionStorage.clear();
});


describe("RecommendGate", () => {
    it("syncs resolved chart spec into app state for export", async () => {
        render(
            <AppStateProvider>
                <RecommendGateHarness />
            </AppStateProvider>,
        );

        await waitFor(() => {
            expect(document.querySelector('[data-testid="chart-spec-kind"]')?.textContent).toBe("km");
            expect(document.querySelector('[data-testid="recommendation-page"]')).toBeTruthy();
        });
    });

});
