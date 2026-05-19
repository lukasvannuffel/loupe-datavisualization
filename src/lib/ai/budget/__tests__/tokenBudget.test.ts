import { describe, expect, it } from "vitest";

import type { RecommendPayload } from "@/lib/ai/recommendChart.types";

import { buildUserPrompt } from "../../prompts/recommend.user";
import { SYSTEM_PROMPT } from "../../prompts/recommend.system";
import { enforceCeiling, estimateTokens } from "../tokenBudget";

const INPUT_TOKEN_CEILING = 5000;
const SAFETY_MARGIN_TOKENS = 100;

const minimalPayload: RecommendPayload = {
    columns: [
        {
            name: "x",
            nullCount: 0,
            primaryType: "numeric",
            uniqueCount: 10,
        },
    ],
    intent: "Short intent.",
    mapping: { x: "x" },
};

const intentBudgetFor = (payload: RecommendPayload): number => {
    const shell: RecommendPayload = { ...payload, intent: "" };
    const fixedOverhead =
        estimateTokens(SYSTEM_PROMPT) +
        estimateTokens(buildUserPrompt(shell)) +
        SAFETY_MARGIN_TOKENS;

    return Math.max(0, INPUT_TOKEN_CEILING - fixedOverhead);
};

const totalInputTokens = (payload: RecommendPayload, intent: string): number =>
    estimateTokens(SYSTEM_PROMPT) + estimateTokens(buildUserPrompt({ ...payload, intent }));

describe("estimateTokens", () => {
    it('returns ceil(length / 4) for "hello world"', () => {
        expect(estimateTokens("hello world")).toBe(3);
    });
});

describe("enforceCeiling", () => {
    it("returns unchanged intent when under budget", () => {
        const result = enforceCeiling(SYSTEM_PROMPT, minimalPayload);

        expect(result.truncated).toBe(false);
        expect(result.intent).toBe(minimalPayload.intent);
    });

    it("truncates intent that exceeds ceiling", () => {
        const longIntent = "word ".repeat(12_000);
        const result = enforceCeiling(SYSTEM_PROMPT, { ...minimalPayload, intent: longIntent });

        expect(result.truncated).toBe(true);
        expect(result.intent.endsWith(" […truncated]")).toBe(true);
        expect(result.finalTokens).toBeLessThan(result.originalTokens);
    });

    it("cuts on word boundary when char budget splits mid-word", () => {
        const payload: RecommendPayload = {
            ...minimalPayload,
            intent: `${"word ".repeat(12_000)}supercalifragilistic`,
        };
        const intentBudget = intentBudgetFor(payload);
        const result = enforceCeiling(SYSTEM_PROMPT, payload);

        expect(result.truncated).toBe(true);
        expect(result.intent).not.toContain("supercalifragilistic");
        expect(result.intent.endsWith(" […truncated]")).toBe(true);
        expect(result.finalTokens).toBeLessThanOrEqual(intentBudget);
    });

    it("dense alphanumeric intent at intentBudget tokens forces truncation and total stays <= 5000", () => {
        const intentBudget = intentBudgetFor(minimalPayload);
        const dense = "a".repeat(intentBudget * 4 + 100);
        const result = enforceCeiling(SYSTEM_PROMPT, { ...minimalPayload, intent: dense });

        expect(result.truncated).toBe(true);
        expect(result.finalTokens).toBeLessThanOrEqual(intentBudget);
        expect(totalInputTokens(minimalPayload, result.intent)).toBeLessThanOrEqual(INPUT_TOKEN_CEILING);
    });

    it("handles pathologically long intent without error", () => {
        const result = enforceCeiling(SYSTEM_PROMPT, {
            ...minimalPayload,
            intent: "x".repeat(50_000),
        });

        expect(result.truncated).toBe(true);
        expect(totalInputTokens(minimalPayload, result.intent)).toBeLessThanOrEqual(INPUT_TOKEN_CEILING);
    });
});
