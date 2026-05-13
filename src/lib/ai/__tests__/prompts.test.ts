import { describe, expect, it } from "vitest";

import { SYSTEM_PROMPT } from "../prompts/recommend.system";
import { buildUserPrompt } from "../prompts/recommend.user";
import type { RecommendPayload } from "../recommendChart.types";

describe("recommend prompts", () => {
    it("keeps the system prompt within budget", () => {
        expect(SYSTEM_PROMPT.length).toBeLessThan(2500);
    });

    it("names every MVP chart kind", () => {
        expect(SYSTEM_PROMPT).toMatch(/km/);
        expect(SYSTEM_PROMPT).toMatch(/barError/);
        expect(SYSTEM_PROMPT).toMatch(/box/);
        expect(SYSTEM_PROMPT).toMatch(/xy/);
    });

    it("does not advertise catalogue-only chart slugs", () => {
        expect(SYSTEM_PROMPT).not.toMatch(/roc|forest|violin|bland.?altman|volcano|swimmer/i);
    });

    it("builds a compact user prompt without leaking payload-only keys", () => {
        const payload: RecommendPayload = {
            columns: [
                {
                    name: "alpha_metric",
                    nullCount: 2,
                    primaryType: "numeric",
                    uniqueCount: 40,
                },
                {
                    name: "beta_flag",
                    nullCount: 0,
                    primaryType: "binary",
                    uniqueCount: 2,
                },
                {
                    name: "gamma_group",
                    nullCount: 1,
                    primaryType: "categorical",
                    semanticTag: "patient-id",
                    uniqueCount: 38,
                },
                {
                    name: "delta_days",
                    nullCount: 0,
                    primaryType: "integer",
                    semanticTag: "time-to-event",
                    uniqueCount: 36,
                },
                {
                    name: "epsilon_event",
                    nullCount: 0,
                    primaryType: "binary",
                    semanticTag: "event-status",
                    uniqueCount: 2,
                },
            ],
            intent: "Describe association between treatment context and measured outcomes.",
            mapping: {
                event: "epsilon_event",
                group: "gamma_group",
                time: "delta_days",
            },
        };

        const prompt = buildUserPrompt(payload);

        expect(prompt.length).toBeLessThan(1500);
        expect(prompt).not.toContain("sampleValues");
        expect(prompt).not.toContain("rows");
        expect(prompt).not.toContain("data:");
        expect(prompt).not.toContain("raw");
    });
});
