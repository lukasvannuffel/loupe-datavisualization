// @vitest-environment happy-dom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as providers from "@/app/providers";
import { AppStateProvider, useAppState } from "@/app/providers";
import type { Receipt } from "@/lib/chartSpec/types";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { brandRows } from "@/lib/parser/types";

import { RecommendationAiPending } from "@/components/pages/recommendation/RecommendationAiPending";

const recommendChartMock = vi.hoisted(() => vi.fn());
const getCacheEntryMock = vi.hoisted(() => vi.fn());
const setCacheEntryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/recommendChart", () => ({
    recommendChart: recommendChartMock,
}));

vi.mock("@/lib/ai/recommendCache/cache", () => ({
    clearCache: vi.fn(),
    getCacheEntry: getCacheEntryMock,
    setCacheEntry: setCacheEntryMock,
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/toast/useToast", () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

const col = (
    over: Partial<ColumnInference> & Pick<ColumnInference, "name" | "primaryType">,
): ColumnInference => ({
    confidence: 1,
    reasons: [],
    nullCount: 0,
    uniqueCount: 10,
    sampleValues: [],
    ...over,
});

const KM_INFERENCES: readonly ColumnInference[] = [
    col({ name: "time_to_event_months", primaryType: "numeric", semanticTag: "time-to-event" }),
    col({ name: "event_observed", primaryType: "binary", semanticTag: "event-status" }),
];

const VALID_MAPPING = { time: "time_to_event_months", event: "event_observed" } as const;

const noop = vi.fn();

const baseAiAppState = (
    overrides: Partial<ReturnType<typeof useAppState>> = {},
): ReturnType<typeof useAppState> => ({
    appendOverride: noop,
    chartKind: null,
    chartSlug: null,
    chartSpec: null,
    clearDataset: noop,
    clearRecommendCache: noop,
    dataset: {
        inferences: KM_INFERENCES,
        rows: brandRows([]),
    },
    hydrated: true,
    intent: "Compare survival between arms",
    lastRecommendationFromCache: false,
    mapping: { ...VALID_MAPPING },
    receipt: null,
    selectionMode: "ai",
    setChartKind: noop,
    setChartSlug: noop,
    setChartSpec: noop,
    setDataset: noop,
    setIntent: noop,
    setLastRecommendationFromCache: noop,
    setMapping: noop,
    setReceipt: noop,
    setSelectionMode: noop,
    updateLatestOverrideReason: noop,
    ...overrides,
});

const seedAiWizard = (): void => {
    window.sessionStorage.setItem("loupe.dataset", JSON.stringify(KM_INFERENCES));
    window.sessionStorage.setItem("loupe.datasetRows", JSON.stringify([]));
    window.sessionStorage.setItem("loupe.mapping", JSON.stringify(VALID_MAPPING));
    window.sessionStorage.setItem("loupe.intent", "Compare survival between arms");
    window.sessionStorage.setItem("loupe.selectionMode", "ai");
};

beforeEach(() => {
    recommendChartMock.mockReset();
    getCacheEntryMock.mockReset();
    setCacheEntryMock.mockReset();
    getCacheEntryMock.mockResolvedValue({ ok: false });
    setCacheEntryMock.mockResolvedValue(undefined);
    vi.restoreAllMocks();
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

const successReceipt = (): Receipt => ({
    alternatives: [],
    intent: "Compare survival between arms",
    overrides: [],
    recommendation: {
        because: "b",
        becauseTitle: "Because",
        chartName: "KM",
        handles: "h",
        handlesTitle: "Handles",
        headline: "head",
    },
    selectionMode: "ai",
    tests: [],
    testsTitle: "Tests",
    transformations: [],
});

describe("Recommendation — useRecommendation gate", () => {
    it("calls recommendChart exactly once even when component re-renders during loading", async () => {
        seedAiWizard();

        let releasePending: (value: {
            chartType: "km";
            costEstimateEur: number;
            ok: true;
            receipt: Receipt;
        }) => void = () => undefined;

        recommendChartMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    releasePending = resolve;
                }),
        );

        render(
            <AppStateProvider>
                <RecommendationAiPending />
            </AppStateProvider>,
        );

        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            await new Promise((resolve) => {
                window.setTimeout(resolve, 50);
            });
        });

        expect(recommendChartMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            releasePending({
                chartType: "km",
                costEstimateEur: 0.01,
                ok: true,
                receipt: successReceipt(),
            });
        });
    });

    // MUTATION-VERIFY: remove `hydrated &&` from shouldRecommend in RecommendationAiPending.tsx
    // Test: "does not call recommendChart before hydration"
    // Verified manually: 2026-06-01. REVERTED.
    it("does not call recommendChart before hydration", async () => {
        const gate = { hydrated: false };

        vi.spyOn(providers, "useAppState").mockImplementation(() =>
            baseAiAppState({
                hydrated: gate.hydrated,
            }),
        );

        recommendChartMock.mockResolvedValue({
            chartType: "km",
            costEstimateEur: 0.01,
            ok: true,
            receipt: successReceipt(),
        });

        const { unmount } = render(<RecommendationAiPending />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(recommendChartMock).not.toHaveBeenCalled();
        unmount();

        gate.hydrated = true;
        render(<RecommendationAiPending />);

        await waitFor(() => {
            expect(recommendChartMock).toHaveBeenCalledTimes(1);
        });
    });

    // MUTATION-VERIFY: remove `&& mappingValid` from shouldRecommend in RecommendationAiPending.tsx
    // Test: "does not call recommendChart when mapping is invalid"
    // Verified manually: 2026-06-01. REVERTED.
    it("does not call recommendChart when mapping is invalid", async () => {
        vi.spyOn(providers, "useAppState").mockImplementation(() =>
            baseAiAppState({
                hydrated: true,
                mapping: {},
            }),
        );

        render(<RecommendationAiPending />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(recommendChartMock).not.toHaveBeenCalled();
    });

    // MUTATION-VERIFY: remove `selectionMode === "ai"` from shouldRecommend in RecommendationAiPending.tsx
    // Test: "does NOT fire recommendChart when selectionMode is manual"
    // Verified manually: 2026-06-01. REVERTED.
    it("does NOT fire recommendChart when selectionMode is manual", async () => {
        vi.spyOn(providers, "useAppState").mockImplementation(() =>
            baseAiAppState({
                hydrated: true,
                selectionMode: "manual",
            }),
        );

        render(<RecommendationAiPending />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(recommendChartMock).not.toHaveBeenCalled();
    });
});
