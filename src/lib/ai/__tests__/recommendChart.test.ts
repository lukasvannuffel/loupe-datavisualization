import { describe, expect, it, vi, beforeEach } from "vitest";

import type { ResolvedEnv } from "@/lib/ai/client.types";

import { recommendChart } from "../recommendChart";
import { PRICING_PER_MILLION_USD, USD_TO_EUR } from "../recommendChart.pricing";
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
    alternatives: [
        {
            name: "Bar with error bars",
            reason: "If focus were group means without time axis.",
            slug: "barError" as const,
        },
    ],
    chartType: "km" as const,
    confidence: 0.88,
    recommendation: {
        because: "Time-oriented outcome with event indicator suits survival-style curves.",
        becauseTitle: "Because",
        chartName: "Kaplan–Meier",
        handles: "Shows survival and censoring across arms.",
        handlesTitle: "Handles",
        headline: "A survival-style curve fits this intent.",
    },
    tests: [{ label: "Illustrative check only" }],
    testsTitle: "Statistical notes",
    transformations: [{ chart: "KM plot", verb: "Plot as" }],
};

describe("recommendChart", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getEnvMock.mockReturnValue({
            apiKey: "test-key",
            model: "anthropic/claude-sonnet-4.6",
        });
        generateObjectMock.mockResolvedValue({
            object: validAiObject,
            usage: {
                inputTokenDetails: {},
                inputTokens: 800,
                outputTokenDetails: {},
                outputTokens: 400,
                totalTokens: 1200,
            },
        });
    });

    it("rejects top-level rows before calling the model (privacy)", async () => {
        const bad = { ...validPayload, rows: [{ a: 1 }] } as unknown as RecommendInput;

        const result = await recommendChart(bad);

        expect(generateObjectMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            code: "PRIVACY_VIOLATION",
            message: "Payload contains forbidden fields.",
            ok: false,
        });
    });

    it("rejects nested sampleValues on a column before calling the model", async () => {
        const bad = {
            ...validPayload,
            columns: [
                {
                    name: "x",
                    nullCount: 0,
                    primaryType: "numeric",
                    sampleValues: ["x"],
                    uniqueCount: 1,
                },
            ],
        } as unknown as RecommendInput;

        const result = await recommendChart(bad);

        expect(generateObjectMock).not.toHaveBeenCalled();
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe("PRIVACY_VIOLATION");
        }
    });

    it("rejects forbidden nested mapping keys (strict + privacy policy)", async () => {
        const bad = {
            columns: validPayload.columns,
            intent: validPayload.intent,
            mapping: {
                data: { nested: "x" },
                time: "days_on_study",
            },
        } as unknown as RecommendInput;

        const result = await recommendChart(bad);

        expect(generateObjectMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            code: "PRIVACY_VIOLATION",
            message: "Payload contains forbidden fields.",
            ok: false,
        });
    });

    it("rejects empty intent with VALIDATION_FAILED (not privacy)", async () => {
        const bad = { ...validPayload, intent: "" };

        const result = await recommendChart(bad);

        expect(generateObjectMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            code: "VALIDATION_FAILED",
            message: "Payload failed schema validation.",
            ok: false,
        });
    });

    it("rejects mapping that references a missing column", async () => {
        const bad: RecommendInput = {
            columns: [
                {
                    name: "a",
                    nullCount: 0,
                    primaryType: "numeric",
                    uniqueCount: 1,
                },
            ],
            intent: "Describe relationship.",
            mapping: { time: "ghost" },
        };

        const result = await recommendChart(bad);

        expect(generateObjectMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            code: "VALIDATION_FAILED",
            message: "Payload failed schema validation.",
            ok: false,
        });
    });

    it("returns a KM receipt on success", async () => {
        const result = await recommendChart(validPayload);

        expect(result.ok).toBe(true);

        if (!result.ok) {
            return;
        }

        expect(result.chartType).toBe("km");
        expect(result.receipt.selectionMode).toBe("ai");
        expect(result.receipt.intent).toBe(validPayload.intent);
        expect(result.receipt.recommendation).toEqual(validAiObject.recommendation);
        expect(result.receipt.alternatives).toEqual(validAiObject.alternatives);
        expect(result.receipt.transformations).toEqual(validAiObject.transformations);
        expect(result.receipt.testsTitle).toBe(validAiObject.testsTitle);
        expect(result.receipt.tests).toEqual(validAiObject.tests);
    });

    it("fails validation when chartType is roc (catalogue-only slug)", async () => {
        generateObjectMock.mockResolvedValueOnce({
            object: { ...validAiObject, chartType: "roc" } as unknown,
            usage: { inputTokens: 1, outputTokens: 1 },
        });

        const result = await recommendChart(validPayload);

        expect(result).toEqual({
            code: "VALIDATION_FAILED",
            message: "AI response did not match the schema.",
            ok: false,
        });
    });

    it("fails validation when alternatives use a catalogue-only slug (roc)", async () => {
        generateObjectMock.mockResolvedValueOnce({
            object: {
                ...validAiObject,
                alternatives: [
                    {
                        name: "ROC curve",
                        reason: "Discrimination curve.",
                        slug: "roc",
                    },
                ],
            } as unknown,
            usage: { inputTokens: 1, outputTokens: 1 },
        });

        const result = await recommendChart(validPayload);

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.code).toBe("VALIDATION_FAILED");
        }
    });

    it("fails validation when alternatives use violin slug", async () => {
        generateObjectMock.mockResolvedValueOnce({
            object: {
                ...validAiObject,
                alternatives: [
                    {
                        name: "Violin plot",
                        reason: "Density view.",
                        slug: "violin",
                    },
                ],
            } as unknown,
            usage: { inputTokens: 1, outputTokens: 1 },
        });

        const result = await recommendChart(validPayload);

        expect(result).toEqual({
            code: "VALIDATION_FAILED",
            message: "AI response did not match the schema.",
            ok: false,
        });
    });

    it("fails validation when chartType is violin", async () => {
        generateObjectMock.mockResolvedValueOnce({
            object: { ...validAiObject, chartType: "violin" } as unknown,
            usage: { inputTokens: 1, outputTokens: 1 },
        });

        const result = await recommendChart(validPayload);

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.code).toBe("VALIDATION_FAILED");
        }
    });

    it("maps AbortError to TIMEOUT", async () => {
        generateObjectMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

        const result = await recommendChart(validPayload);

        expect(result).toEqual({
            code: "TIMEOUT",
            message: "AI gateway timed out.",
            ok: false,
        });
    });

    it("maps upstream errors to a generic message", async () => {
        generateObjectMock.mockRejectedValueOnce(new Error("upstream 502 from gw.anthropic"));

        const result = await recommendChart(validPayload);

        expect(result.ok).toBe(false);

        if (!result.ok) {
            expect(result.code).toBe("UPSTREAM_FAILURE");
            expect(result.message).not.toMatch(/502/i);
            expect(result.message.toLowerCase()).not.toContain("anthropic");
        }
    });

    it("estimates cost from PRICING_PER_MILLION_USD for the active model", async () => {
        const result = await recommendChart(validPayload);

        expect(result.ok).toBe(true);

        if (!result.ok) {
            return;
        }

        const model = "anthropic/claude-sonnet-4.6";
        const rates = PRICING_PER_MILLION_USD[model]!;
        const expectedEur =
            (((800 / 1_000_000) * rates.input + (400 / 1_000_000) * rates.output) * USD_TO_EUR);

        expect(result.costEstimateEur).toBeCloseTo(expectedEur, 5);
        expect(result.costEstimateEur).toBeLessThan(0.05);
    });

    it("logs token usage with console.info", async () => {
        const spy = vi.spyOn(console, "info").mockImplementation(() => {});

        await recommendChart(validPayload);

        expect(spy).toHaveBeenCalledWith(
            "[ai] recommend",
            expect.objectContaining({
                inputTokens: 800,
                latencyMs: expect.any(Number),
                model: "anthropic/claude-sonnet-4.6",
                outputTokens: 400,
            }),
        );

        spy.mockRestore();
    });

    it("returns MISSING_ENV when the gateway is not configured", async () => {
        getEnvMock.mockReturnValueOnce({ missing: ["AI_GATEWAY_API_KEY"] });

        const result = await recommendChart(validPayload);

        expect(generateObjectMock).not.toHaveBeenCalled();
        expect(result).toEqual({
            code: "MISSING_ENV",
            message: "AI gateway is not configured.",
            ok: false,
        });
    });
});
