import { describe, expect, it } from "vitest";

import { SYSTEM_PROMPT } from "../prompts/recommend.system";
import { AI_RESPONSE_MAX_LENGTH } from "../recommendChart.schemas";

describe("SYSTEM_PROMPT (LOUPE-06 catalogue boundary)", () => {
    it("names all four MVP chart kinds with guidance", () => {
        expect(SYSTEM_PROMPT).toMatch(/\bkm\b/);
        expect(SYSTEM_PROMPT).toMatch(/barError/);
        expect(SYSTEM_PROMPT).toMatch(/\bbox\b/);
        expect(SYSTEM_PROMPT).toMatch(/\bxy\b/);
    });

    it("does not leak Library-only catalogue slugs (prompt surface)", () => {
        expect(SYSTEM_PROMPT).not.toMatch(/\broc\b/i);
        expect(SYSTEM_PROMPT).not.toMatch(/\bforest\b/i);
        expect(SYSTEM_PROMPT).not.toMatch(/\bviolin\b/i);
        expect(SYSTEM_PROMPT).not.toMatch(/bland\s*[-–]?\s*altman/i);
        expect(SYSTEM_PROMPT).not.toMatch(/\bvolcano\b/i);
        expect(SYSTEM_PROMPT).not.toMatch(/\bswimmer\b/i);
    });

    it("states every response string limit enforced by aiResponseSchema", () => {
        Object.entries(AI_RESPONSE_MAX_LENGTH).forEach(([field, max]) => {
            expect(SYSTEM_PROMPT).toContain(`${field} ≤ ${max}`);
        });
    });
});
