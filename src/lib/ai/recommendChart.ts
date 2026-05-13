"use server";

import { generateObject } from "ai";

import type { Receipt } from "@/lib/chartSpec/types";

import { createGatewayLanguageModel, getEnv } from "./client";
import { aiResponseSchema, payloadSchema } from "./recommendChart.schemas";
import type { RecommendInput, RecommendResult } from "./recommendChart.types";
import { SYSTEM_PROMPT } from "./prompts/recommend.system";
import { buildUserPrompt } from "./prompts/recommend.user";

const estimateCostEur = (usage?: {
    inputTokens?: number;
    outputTokens?: number;
}): number => {
    const inputUsd = ((usage?.inputTokens ?? 0) / 1_000_000) * 3;
    const outputUsd = ((usage?.outputTokens ?? 0) / 1_000_000) * 15;

    return (inputUsd + outputUsd) * 0.93;
};

export const recommendChart = async (input: RecommendInput): Promise<RecommendResult> => {
    const parsed = payloadSchema.safeParse(input);

    if (!parsed.success) {
        console.error("[ai] payload validation failed", parsed.error.flatten());

        return { ok: false, code: "PRIVACY_VIOLATION", message: "Payload contains forbidden fields." };
    }

    const env = getEnv();

    if ("missing" in env) {
        return { ok: false, code: "MISSING_ENV", message: "AI gateway is not configured." };
    }

    const model = createGatewayLanguageModel(env);
    const startedAt = Date.now();

    try {
        const result = await generateObject({
            abortSignal: AbortSignal.timeout(30_000),
            maxOutputTokens: 1200,
            model,
            prompt: buildUserPrompt(parsed.data),
            schema: aiResponseSchema,
            system: SYSTEM_PROMPT,
        });

        const ai = aiResponseSchema.safeParse(result.object);

        if (!ai.success) {
            console.error("[ai] response failed re-validation", ai.error.flatten());

            return {
                ok: false,
                code: "VALIDATION_FAILED",
                message: "AI response did not match the schema.",
            };
        }

        const latencyMs = Date.now() - startedAt;

        console.info("[ai] recommend", {
            inputTokens: result.usage.inputTokens,
            latencyMs,
            model: env.model,
            outputTokens: result.usage.outputTokens,
        });

        const receipt: Receipt = {
            alternatives: ai.data.alternatives,
            intent: parsed.data.intent,
            recommendation: ai.data.recommendation,
            selectionMode: "ai",
            tests: ai.data.tests,
            testsTitle: ai.data.testsTitle,
            transformations: ai.data.transformations,
        };

        return {
            chartType: ai.data.chartType,
            costEstimateEur: estimateCostEur(result.usage),
            ok: true,
            receipt,
        };
    } catch (err) {
        const aborted =
            (typeof DOMException !== "undefined" &&
                err instanceof DOMException &&
                err.name === "AbortError") ||
            (err instanceof Error && err.name === "AbortError");

        if (aborted) {
            return { ok: false, code: "TIMEOUT", message: "AI gateway timed out." };
        }

        console.error("[ai] recommend upstream failure", err);

        return { ok: false, code: "UPSTREAM_FAILURE", message: "AI gateway upstream error." };
    }
};
