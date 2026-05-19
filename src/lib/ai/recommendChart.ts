"use server";

import type { ZodError } from "zod";

import { enforceCeiling } from "./budget/tokenBudget";
import { getEnv } from "./client";
import { runRecommendAi } from "./recommendChart.run";
import {
    FORBIDDEN_PAYLOAD_REFINE_MESSAGE,
    payloadSchema,
} from "./recommendChart.schemas";
import type { RecommendInput, RecommendPayload, RecommendResult } from "./recommendChart.types";
import { resolveActorKey } from "./rateLimit/actorKey";
import { checkAndRecord } from "./rateLimit/rateLimit";
import { SYSTEM_PROMPT } from "./prompts/recommend.system";

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

    const env = getEnv();

    if ("missing" in env) {
        return { ok: false, code: "MISSING_ENV", message: "AI gateway is not configured." };
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

    return runRecommendAi(env, safePayload, budget, actorKey);
};
