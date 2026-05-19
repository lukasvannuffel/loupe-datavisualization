import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedEnv } from "@/lib/ai/client.types";

import { recommendChart } from "../recommendChart";
import type { RecommendInput } from "../recommendChart.types";

const generateObjectMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
    generateObject: generateObjectMock,
}));

type GetEnvResult = ResolvedEnv | { readonly missing: readonly string[] };

vi.mock("../client", () => ({
    createGatewayLanguageModel: vi.fn(() => ({})),
    getEnv: vi.fn(
        (): GetEnvResult => ({
            apiKey: "test-key",
            model: "anthropic/claude-sonnet-4.6",
        }),
    ),
}));

vi.mock("../rateLimit/actorKey", () => ({
    resolveActorKey: vi.fn().mockResolvedValue("user:test-actor"),
}));

vi.mock("../rateLimit/rateLimit", () => ({
    checkAndRecord: vi.fn().mockResolvedValue({ allowed: true, remaining: 19 }),
}));

const baseColumns: RecommendInput["columns"] = [
    {
        name: "x",
        nullCount: 0,
        primaryType: "numeric",
        uniqueCount: 10,
    },
];

const validAiObject = {
    alternatives: [],
    chartType: "km" as const,
    confidence: 0.9,
    recommendation: {
        because: "Because",
        becauseTitle: "Because",
        chartName: "KM",
        handles: "Handles",
        handlesTitle: "Handles",
        headline: "Headline",
    },
    tests: [],
    testsTitle: "Tests",
    transformations: [],
};

describe("recommendChart token budget", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "info").mockImplementation(() => {});
        generateObjectMock.mockResolvedValue({
            object: validAiObject,
            usage: { inputTokens: 500, outputTokens: 100 },
        });
    });

    it("does not truncate short intent", async () => {
        const payload: RecommendInput = {
            columns: baseColumns,
            intent: "Short research question.",
            mapping: { x: "x" },
        };

        const result = await recommendChart(payload);

        expect(result.ok).toBe(true);

        if (result.ok) {
            expect(result.receipt.intent).toBe(payload.intent);
        }

        const logCall = vi.mocked(console.info).mock.calls.find(([msg]) => msg === "[ai] recommend");

        expect(logCall?.[1]).toMatchObject({ intentTruncated: false });
        expect(generateObjectMock.mock.calls[0]?.[0]?.prompt).toContain(payload.intent);
    });

    it("truncates very long intent and logs intentTruncated", async () => {
        const longIntent = "analyze ".repeat(15_000);
        const payload: RecommendInput = {
            columns: baseColumns,
            intent: longIntent,
            mapping: { x: "x" },
        };

        const result = await recommendChart(payload);

        expect(result.ok).toBe(true);

        if (result.ok) {
            expect(result.receipt.intent.endsWith(" […truncated]")).toBe(true);
            expect(result.receipt.intent.length).toBeLessThan(longIntent.length);
        }

        const logCall = vi.mocked(console.info).mock.calls.find(([msg]) => msg === "[ai] recommend");

        expect(logCall?.[1]).toMatchObject({ intentTruncated: true });
        expect(generateObjectMock.mock.calls[0]?.[0]?.prompt).toContain(" […truncated]");
    });
});
