// @vitest-environment happy-dom
// Mocked cache test — verifies hook contract. See cachePersistence.test.ts for end-to-end storage behavior.

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toContentHash } from "@/lib/ai/recommendCache/hash";
import type { Receipt } from "@/lib/chartSpec/types";

import { useRecommendation } from "../useRecommendation";

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

const successReceipt = (): Receipt => ({
    alternatives: [],
    intent: "x",
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

describe("useRecommendation", () => {
    beforeEach(() => {
        recommendChartMock.mockReset();
        getCacheEntryMock.mockReset();
        setCacheEntryMock.mockReset();
        getCacheEntryMock.mockResolvedValue({ ok: false });
        setCacheEntryMock.mockResolvedValue(undefined);
    });

    it("starts idle, moves to loading then success on miss", async () => {
        recommendChartMock.mockResolvedValueOnce({
            chartType: "km",
            costEstimateEur: 0.01,
            ok: true,
            receipt: successReceipt(),
        });

        const { result } = renderHook(() => useRecommendation());

        expect(result.current.state.status).toBe("idle");

        await act(async () => {
            await result.current.run(basePayload);
        });

        expect(getCacheEntryMock).toHaveBeenCalledTimes(1);
        expect(recommendChartMock).toHaveBeenCalledTimes(1);
        expect(setCacheEntryMock).toHaveBeenCalledTimes(1);
        expect(result.current.state).toMatchObject({
            chartKind: "km",
            fromCache: false,
            status: "success",
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.state.status).toBe("idle");
    });

    it("maps failure to error state and does not write the cache", async () => {
        recommendChartMock.mockResolvedValueOnce({
            code: "VALIDATION_FAILED",
            message: "bad",
            ok: false,
        });

        const { result } = renderHook(() => useRecommendation());

        await act(async () => {
            await result.current.run(basePayload);
        });

        expect(result.current.state).toEqual({
            code: "VALIDATION_FAILED",
            message: "bad",
            status: "error",
        });
        expect(setCacheEntryMock).not.toHaveBeenCalled();
    });

    it("hits cache without calling recommendChart and flags fromCache", async () => {
        const r = successReceipt();
        getCacheEntryMock.mockResolvedValueOnce({
            entry: {
                cachedAt: new Date().toISOString(),
                chartKind: "km",
                costEstimateEur: 0,
                hash: toContentHash("00".repeat(32)),
                receipt: r,
            },
            ok: true,
        });

        const { result } = renderHook(() => useRecommendation());

        await act(async () => {
            await result.current.run(basePayload);
        });

        expect(recommendChartMock).not.toHaveBeenCalled();
        expect(setCacheEntryMock).not.toHaveBeenCalled();
        expect(result.current.state).toMatchObject({
            chartKind: "km",
            fromCache: true,
            receipt: r,
            status: "success",
        });
    });

    it("invokes onSuccess once with cached values", async () => {
        const r = successReceipt();
        getCacheEntryMock.mockResolvedValueOnce({
            entry: {
                cachedAt: new Date().toISOString(),
                chartKind: "km",
                costEstimateEur: 0,
                hash: toContentHash("11".repeat(32)),
                receipt: r,
            },
            ok: true,
        });
        const onSuccess = vi.fn();

        const { result } = renderHook(() => useRecommendation({ onSuccess }));

        await act(async () => {
            await result.current.run(basePayload);
        });

        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith(r, "km", true);
    });

    it("cache hit returns pristine AI receipt without user overrides", async () => {
        const pristine = successReceipt();
        const overridden: Receipt = {
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
        getCacheEntryMock
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({
                entry: {
                    cachedAt: new Date().toISOString(),
                    chartKind: "km",
                    costEstimateEur: 0,
                    hash: toContentHash("22".repeat(32)),
                    receipt: pristine,
                },
                ok: true,
            });

        const { result } = renderHook(() => useRecommendation());

        await act(async () => {
            await result.current.run(basePayload);
        });
        expect(setCacheEntryMock).toHaveBeenCalledWith(
            basePayload,
            pristine,
            "km",
            0.01,
        );
        expect(setCacheEntryMock).not.toHaveBeenCalledWith(
            basePayload,
            overridden,
            "km",
            expect.anything(),
        );

        await act(async () => {
            await result.current.run(basePayload);
        });
        expect(recommendChartMock).toHaveBeenCalledTimes(1);
        if (result.current.state.status === "success") {
            expect(result.current.state.receipt.overrides).toEqual([]);
            expect(result.current.state.receipt).not.toEqual(overridden);
        }
    });
});
