import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ResolvedEnv } from "@/lib/ai/client.types";

import { recommendChart } from "../recommendChart";
import type { RecommendInput } from "../recommendChart.types";

const generateObjectMock = vi.hoisted(() => vi.fn());
const checkAndRecordMock = vi.hoisted(() => vi.fn());

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
    checkAndRecord: checkAndRecordMock,
}));

const validPayload: RecommendInput = {
    columns: [
        {
            name: "days_on_study",
            nullCount: 0,
            primaryType: "numeric",
            uniqueCount: 50,
        },
        {
            name: "ended_study",
            nullCount: 0,
            primaryType: "binary",
            uniqueCount: 2,
        },
    ],
    intent: "Compare endpoints between arms over follow-up.",
    mapping: {
        event: "ended_study",
        time: "days_on_study",
    },
};

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

describe("recommendChart rate limit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        generateObjectMock.mockResolvedValue({
            object: validAiObject,
            usage: { inputTokens: 100, outputTokens: 50 },
        });
    });

    it("allows 20 calls then returns RATE_LIMITED on the 21st without calling the model", async () => {
        let callCount = 0;

        checkAndRecordMock.mockImplementation(async () => {
            callCount += 1;

            if (callCount <= 20) {
                return { allowed: true, remaining: 20 - callCount };
            }

            return { allowed: false, retryAfterSeconds: 3600 };
        });

        for (let i = 0; i < 20; i += 1) {
            const result = await recommendChart(validPayload);

            expect(result.ok).toBe(true);
        }

        const blocked = await recommendChart(validPayload);

        expect(blocked).toEqual({
            code: "RATE_LIMITED",
            message: expect.stringContaining("minutes"),
            ok: false,
        });
        expect(generateObjectMock).toHaveBeenCalledTimes(20);
    });
});
