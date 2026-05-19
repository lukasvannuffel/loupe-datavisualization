import type { RecommendPayload } from "@/lib/ai/recommendChart.types";

import { buildUserPrompt } from "../prompts/recommend.user";

const CHARS_PER_TOKEN = 4;
const INPUT_TOKEN_CEILING = 5000;
const SAFETY_MARGIN_TOKENS = 100;
const TRUNCATION_SUFFIX = " […truncated]";

export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

export type TruncationResult = {
    readonly intent: string;
    readonly truncated: boolean;
    readonly originalTokens: number;
    readonly finalTokens: number;
};

export const enforceCeiling = (
    systemPrompt: string,
    payload: RecommendPayload,
): TruncationResult => {
    const shell: RecommendPayload = { ...payload, intent: "" };
    const fixedOverhead =
        estimateTokens(systemPrompt) +
        estimateTokens(buildUserPrompt(shell)) +
        SAFETY_MARGIN_TOKENS;
    const intentBudget = Math.max(0, INPUT_TOKEN_CEILING - fixedOverhead);
    const intentTokens = estimateTokens(payload.intent);

    if (intentTokens <= intentBudget) {
        return {
            intent: payload.intent,
            truncated: false,
            originalTokens: intentTokens,
            finalTokens: intentTokens,
        };
    }

    const charBudget = Math.max(0, intentBudget * CHARS_PER_TOKEN - TRUNCATION_SUFFIX.length);
    const cut = payload.intent.slice(0, charBudget).replace(/\s+\S*$/, "");
    const truncated = `${cut}${TRUNCATION_SUFFIX}`;

    return {
        intent: truncated,
        truncated: true,
        originalTokens: intentTokens,
        finalTokens: estimateTokens(truncated),
    };
};
