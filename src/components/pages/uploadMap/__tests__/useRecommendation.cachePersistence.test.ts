// @vitest-environment happy-dom
// Real-sessionStorage test — verifies what actually lands on disk. See useRecommendation.test.ts for hook contract.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPayload } from "@/lib/ai/recommendCache/cache";
import type { Receipt } from "@/lib/chartSpec/types";

import { useRecommendation } from "../useRecommendation";

const STORAGE_KEY = "loupe.recommendCache";

const recommendChartMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/recommendChart", () => ({
    recommendChart: recommendChartMock,
}));

const pristineReceipt = (): Receipt => ({
    alternatives: [],
    intent: "intent",
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

const basePayload = { columns: [], intent: "intent", mapping: {} };

describe("useRecommendation cache persistence (real sessionStorage)", () => {
    beforeEach(() => {
        window.sessionStorage.clear();
        recommendChartMock.mockReset();
    });

    afterEach(() => {
        window.sessionStorage.clear();
    });

    it("writes the AI receipt to loupe.recommendCache without user overrides", async () => {
        const pristine = pristineReceipt();
        const userEdited: Receipt = {
            ...pristine,
            overrides: [
                {
                    at: "2026-05-19T14:23:00.000Z",
                    from: "km",
                    to: "box",
                },
            ],
        };
        recommendChartMock.mockResolvedValueOnce({
            chartType: "km",
            costEstimateEur: 0.01,
            ok: true,
            receipt: pristine,
        });

        const { result } = renderHook(() => useRecommendation());

        await act(async () => {
            await result.current.run(basePayload);
        });

        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        expect(raw).not.toBeNull();
        const file = JSON.parse(raw!) as {
            entries: Array<{ hash: string; receipt: Receipt }>;
        };
        expect(file.entries).toHaveLength(1);
        expect(file.entries[0]?.receipt.overrides).toEqual([]);
        expect(file.entries[0]?.receipt).toEqual(pristine);
        expect(file.entries[0]?.receipt).not.toEqual(userEdited);
        expect(await hashPayload(basePayload)).toBe(file.entries[0]?.hash);
    });
});
