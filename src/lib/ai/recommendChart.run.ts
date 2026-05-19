import { generateObject } from "ai";

import type { Receipt } from "@/lib/chartSpec/types";

import { getDailyTokenTotal, recordInputTokens } from "./budget/dailyTokenCounter";
import type { TruncationResult } from "./budget/tokenBudget";
import { createGatewayLanguageModel } from "./client";
import type { ResolvedEnv } from "./client.types";
import { PRICING_PER_MILLION_USD, USD_TO_EUR } from "./recommendChart.pricing";
import { aiResponseSchema } from "./recommendChart.schemas";
import type { RecommendPayload, RecommendResult } from "./recommendChart.types";
import type { ActorKey } from "./rateLimit/rateLimit.types";
import { SYSTEM_PROMPT } from "./prompts/recommend.system";
import { buildUserPrompt } from "./prompts/recommend.user";

const FALLBACK_PRICING_MODEL = "anthropic/claude-sonnet-4.6";

const estimateCostEur = (
    usage: { inputTokens?: number; outputTokens?: number } | undefined,
    model: string,
): number => {
    let rates = PRICING_PER_MILLION_USD[model];

    if (rates === undefined) {
        console.warn("[ai] unknown model for cost estimate — using fallback Sonnet 4 rates", model);
        rates = PRICING_PER_MILLION_USD[FALLBACK_PRICING_MODEL]!;
    }

    const inputUsd = ((usage?.inputTokens ?? 0) / 1_000_000) * rates.input;
    const outputUsd = ((usage?.outputTokens ?? 0) / 1_000_000) * rates.output;

    return (inputUsd + outputUsd) * USD_TO_EUR;
};

export const runRecommendAi = async (
    env: ResolvedEnv,
    safePayload: RecommendPayload,
    budget: TruncationResult,
    actorKey: ActorKey,
): Promise<RecommendResult> => {
    const model = createGatewayLanguageModel(env);
    const startedAt = Date.now();

    try {
        const result = await generateObject({
            abortSignal: AbortSignal.timeout(30_000),
            maxOutputTokens: 1200,
            model,
            prompt: buildUserPrompt(safePayload),
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

        const inputTokens = result.usage.inputTokens ?? 0;

        recordInputTokens(inputTokens);

        console.info("[ai] recommend", {
            actorKey,
            dailyTokenTotal: getDailyTokenTotal(),
            inputTokens,
            intentFinalTokens: budget.finalTokens,
            intentOriginalTokens: budget.originalTokens,
            intentTruncated: budget.truncated,
            latencyMs: Date.now() - startedAt,
            model: env.model,
            outputTokens: result.usage.outputTokens,
        });

        const receipt: Receipt = {
            alternatives: ai.data.alternatives,
            intent: safePayload.intent,
            overrides: [],
            recommendation: ai.data.recommendation,
            selectionMode: "ai",
            tests: ai.data.tests,
            testsTitle: ai.data.testsTitle,
            transformations: ai.data.transformations,
        };

        return {
            chartType: ai.data.chartType,
            costEstimateEur: estimateCostEur(result.usage, env.model),
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
