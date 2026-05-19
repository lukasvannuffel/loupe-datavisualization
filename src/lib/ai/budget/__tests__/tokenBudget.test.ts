import { describe, expect, it } from "vitest";

import type { RecommendPayload } from "@/lib/ai/recommendChart.types";

import { SYSTEM_PROMPT } from "../../prompts/recommend.system";
import { enforceCeiling, estimateTokens } from "../tokenBudget";

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
        const result = enforceCeiling(SYSTEM_PROMPT, payload);

        expect(result.truncated).toBe(true);
        expect(result.intent).not.toContain("supercalifragilistic");
        expect(result.intent.endsWith(" […truncated]")).toBe(true);
    });

    it("handles pathologically long intent without error", () => {
        const result = enforceCeiling(SYSTEM_PROMPT, {
            ...minimalPayload,
            intent: "x".repeat(50_000),
        });

        expect(result.truncated).toBe(true);
        expect(estimateTokens(SYSTEM_PROMPT) + result.finalTokens).toBeLessThanOrEqual(5100);
    });
});
