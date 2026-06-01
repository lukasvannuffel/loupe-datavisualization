// @vitest-environment happy-dom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppStateProvider } from "@/app/providers";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { toAiColumns } from "@/lib/ai/toAiColumns";

import { RecommendationAiPending } from "@/components/pages/recommendation/RecommendationAiPending";

const runMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const useRecommendationMock = vi.hoisted(() =>
    vi.fn(() => ({
        reset: vi.fn(),
        run: runMock,
        state: { status: "idle" as const },
    })),
);

vi.mock("../uploadMap/useRecommendation", () => ({
    useRecommendation: useRecommendationMock,
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

const KM_DATASET: readonly ColumnInference[] = [
    col({ name: "time_to_event_months", primaryType: "numeric", semanticTag: "time-to-event" }),
    col({ name: "event_observed", primaryType: "binary", semanticTag: "event-status" }),
];

const seedAiWizard = (): void => {
    window.sessionStorage.setItem("loupe.dataset", JSON.stringify(KM_DATASET));
    window.sessionStorage.setItem("loupe.datasetRows", JSON.stringify([]));
    window.sessionStorage.setItem(
        "loupe.mapping",
        JSON.stringify({ time: "time_to_event_months", event: "event_observed" }),
    );
    window.sessionStorage.setItem("loupe.intent", "Compare survival between arms");
    window.sessionStorage.setItem("loupe.selectionMode", "ai");
};

const renderPending = (): void => {
    act(() => {
        render(
            <AppStateProvider>
                <RecommendationAiPending />
            </AppStateProvider>,
        );
    });
};

beforeEach(() => {
    runMock.mockClear();
    useRecommendationMock.mockClear();
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
});

describe("Recommendation — useRecommendation gate", () => {
    it("fires useRecommendation when selectionMode is ai and state is complete", async () => {
        seedAiWizard();
        renderPending();

        await waitFor(() => {
            expect(useRecommendationMock).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(runMock).toHaveBeenCalledTimes(1);
        });

        const parsedDataset = JSON.parse(
            window.sessionStorage.getItem("loupe.dataset") as string,
        ) as ColumnInference[];
        const mapping = JSON.parse(window.sessionStorage.getItem("loupe.mapping") as string);

        expect(runMock.mock.calls[0]?.[0]).toEqual({
            columns: toAiColumns(parsedDataset),
            intent: "Compare survival between arms",
            mapping,
        });
    });

    // MUTATION-VERIFY: remove `selectionMode === "ai"` from shouldRecommend in
    // RecommendationAiPending.tsx → this test goes RED.
    // Verified manually: 2026-06-01. REVERTED.
    it("does NOT fire run when selectionMode is manual", async () => {
        seedAiWizard();
        window.sessionStorage.setItem("loupe.selectionMode", "manual");
        renderPending();

        await waitFor(() => {
            expect(runMock).not.toHaveBeenCalled();
        });
    });

    it("does NOT fire before hydration completes with incomplete session", () => {
        window.sessionStorage.setItem("loupe.selectionMode", "ai");
        window.sessionStorage.setItem("loupe.intent", "Compare survival");
        renderPending();

        expect(runMock).not.toHaveBeenCalled();
    });
});
