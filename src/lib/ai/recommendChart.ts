"use server";

// File budget: keep this module under 160 lines.

import { generateObject } from "ai";
import type { ZodError } from "zod";

import type { Receipt } from "@/lib/chartSpec/types";

import { getDailyTokenTotal, recordInputTokens } from "./budget/dailyTokenCounter";
import { enforceCeiling } from "./budget/tokenBudget";
import { createGatewayLanguageModel, getEnv } from "./client";
import { estimateCostEur } from "./recommendChart.pricing";
import {
    aiResponseSchema,
    FORBIDDEN_PAYLOAD_REFINE_MESSAGE,
    payloadSchema,
} from "./recommendChart.schemas";
import type { RecommendInput, RecommendPayload, RecommendResult } from "./recommendChart.types";
import { resolveActorKey } from "./rateLimit/actorKey";
import { checkAndRecord } from "./rateLimit/rateLimit";
import { SYSTEM_PROMPT } from "./prompts/recommend.system";
import { buildUserPrompt } from "./prompts/recommend.user";

const isPrivacyPayloadFailure = (error: ZodError): boolean =>
    error.issues.some(
        (issue) =>
            issue.code === "unrecognized_keys" ||
            (issue.code === "custom" && issue.message === FORBIDDEN_PAYLOAD_REFINE_MESSAGE),
    );

export const recommendChart = async (input: RecommendInput): Promise<RecommendResult> => {
    const parsed = payloadSchema.safeParse(input);

    if (!parsed.success) {
        console.error("[ai] payload validation failed", parsed.error.flatten());

        if (isPrivacyPayloadFailure(parsed.error)) {
            return { ok: false, code: "PRIVACY_VIOLATION", message: "Payload contains forbidden fields." };
        }

        return {
            ok: false,
            code: "VALIDATION_FAILED",
            message: "Payload failed schema validation.",
        };
    }

    const env = getEnv();

    if ("missing" in env) {
        return { ok: false, code: "MISSING_ENV", message: "AI gateway is not configured." };
    }

    const actorKey = await resolveActorKey();
    const limit = await checkAndRecord(actorKey);

    if (!limit.allowed) {
        const minutes = Math.ceil(limit.retryAfterSeconds / 60);

        return {
            ok: false,
            code: "RATE_LIMITED",
            message: `Too many recommendations in the last hour. Try again in ${minutes} minutes.`,
        };
    }

    const budget = enforceCeiling(SYSTEM_PROMPT, parsed.data);
    const safePayload: RecommendPayload = budget.truncated
        ? { ...parsed.data, intent: budget.intent }
        : parsed.data;

    if (budget.truncated) {
        console.info("[ai] intent truncated for token budget", {
            intentFinalTokens: budget.finalTokens,
            intentOriginalTokens: budget.originalTokens,
        });
    }

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

        // dailyTokenTotal is approximate — per-process counter, resets on cold start. Real daily totals: Vercel AI Gateway dashboard.
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
