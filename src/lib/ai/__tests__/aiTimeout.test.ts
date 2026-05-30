import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedEnv } from "@/lib/ai/client.types";

import { recommendChart } from "../recommendChart";
import type { RecommendInput } from "../recommendChart.types";

const generateObjectMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
    generateObject: generateObjectMock,
}));

type GetEnvResult = ResolvedEnv | { readonly missing: readonly string[] };

const getEnvMock = vi.hoisted(() =>
    vi.fn((): GetEnvResult => ({
        apiKey: "test-key",
        model: "anthropic/claude-sonnet-4.6",
    })),
);

vi.mock("../client", () => ({
    createGatewayLanguageModel: vi.fn(() => ({})),
    getEnv: getEnvMock,
}));

vi.mock("../rateLimit/actorKey", () => ({
    resolveActorKey: vi.fn().mockResolvedValue("user:test-actor"),
}));

vi.mock("../rateLimit/rateLimit", () => ({
    checkAndRecord: vi.fn().mockResolvedValue({ allowed: true, remaining: 19 }),
}));

const validPayload: RecommendInput = {
    columns: [
        {
            name: "time_to_event_months",
            nullCount: 0,
            primaryType: "numeric",
            uniqueCount: 48,
        },
        {
            name: "event_observed",
            nullCount: 0,
            primaryType: "binary",
            uniqueCount: 2,
        },
    ],
    intent: "Compare overall survival between treatment arms.",
    mapping: {
        event: "event_observed",
        time: "time_to_event_months",
    },
};

const validAiObject = {
    alternatives: [],
    chartType: "km" as const,
    confidence: 0.9,
    recommendation: {
        because: "Survival endpoints with event indicator.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier",
        handles: "Time-to-event curves.",
        handlesTitle: "Handles",
        headline: "KM fits this intent.",
    },
    tests: [{ label: "Log-rank (illustrative)" }],
    testsTitle: "Tests",
    transformations: [{ chart: "KM", verb: "Plot" }],
};

describe("LOUPE-23 aiTimeout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getEnvMock.mockReturnValue({
            apiKey: "test-key",
            model: "anthropic/claude-sonnet-4.6",
        });
        generateObjectMock.mockResolvedValue({
            object: validAiObject,
            usage: { inputTokens: 100, outputTokens: 50 },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("passes AbortSignal.timeout(30_000) to generateObject", async () => {
        const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

        await recommendChart(validPayload);

        expect(timeoutSpy).toHaveBeenCalledWith(30_000);
        expect(generateObjectMock.mock.calls[0]?.[0]?.abortSignal).toBeDefined();

        timeoutSpy.mockRestore();
    });

    it("maps AbortError from the 30s abort boundary to TIMEOUT", async () => {
        const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

        generateObjectMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

        const result = await recommendChart(validPayload);

        expect(timeoutSpy).toHaveBeenCalledWith(30_000);
        expect(result).toEqual({
            code: "TIMEOUT",
            message: "AI gateway timed out.",
            ok: false,
        });
    });

    it("does not expose upstream internals in TIMEOUT message", async () => {
        generateObjectMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

        const result = await recommendChart(validPayload);

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.code).toBe("TIMEOUT");
            expect(result.message).toBe("AI gateway timed out.");
            expect(result.message.toLowerCase()).not.toContain("abort");
            expect(result.message).not.toMatch(/anthropic|502|stack|internal/i);
        }
    });

    it("does not expose upstream internals in UPSTREAM_FAILURE message", async () => {
        generateObjectMock.mockRejectedValueOnce(
            new Error("upstream 502 Bad Gateway from gw.anthropic.internal/api"),
        );

        const result = await recommendChart(validPayload);

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.code).toBe("UPSTREAM_FAILURE");
            expect(result.message).toBe("AI gateway upstream error.");
            expect(result.message).not.toMatch(/502|anthropic|internal|stack/i);
        }
    });
});
