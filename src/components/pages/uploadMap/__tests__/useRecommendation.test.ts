// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRecommendation } from "../useRecommendation";

const recommendChartMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/recommendChart", () => ({
    recommendChart: recommendChartMock,
}));

describe("useRecommendation", () => {
    beforeEach(() => {
        recommendChartMock.mockReset();
    });

    it("starts idle, moves to loading then success", async () => {
        recommendChartMock.mockResolvedValueOnce({
            chartType: "km",
            costEstimateEur: 0.01,
            ok: true,
            receipt: {
                alternatives: [],
                intent: "x",
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
            },
        });

        const { result } = renderHook(() => useRecommendation());

        expect(result.current.state.status).toBe("idle");

        await act(async () => {
            await result.current.run({
                columns: [],
                intent: "intent",
                mapping: {},
            });
        });

        expect(result.current.state.status).toBe("success");

        if (result.current.state.status === "success") {
            expect(result.current.state.chartKind).toBe("km");
        }

        act(() => {
            result.current.reset();
        });

        expect(result.current.state.status).toBe("idle");
    });

    it("maps failure to error state", async () => {
        recommendChartMock.mockResolvedValueOnce({
            code: "VALIDATION_FAILED",
            message: "bad",
            ok: false,
        });

        const { result } = renderHook(() => useRecommendation());

        await act(async () => {
            await result.current.run({
                columns: [],
                intent: "intent",
                mapping: {},
            });
        });

        expect(result.current.state).toEqual({
            code: "VALIDATION_FAILED",
            message: "bad",
            status: "error",
        });
    });
});
