import { describe, expect, it } from "vitest";

import { columnInferenceSchema } from "../inference.schemas";

const minimalOk = {
    confidence: 1,
    name: "col_a",
    nullCount: 0,
    primaryType: "numeric",
    reasons: [] as readonly string[],
    sampleValues: ["a", "b", "c", "d", "e"] as readonly string[],
    uniqueCount: 10,
};

describe("columnInferenceSchema", () => {
    it("accepts at most five sample values", () => {
        expect(columnInferenceSchema.safeParse(minimalOk).success).toBe(true);
    });

    it("rejects more than five sample values", () => {
        const bad = {
            ...minimalOk,
            sampleValues: ["1", "2", "3", "4", "5", "6"],
        };

        expect(columnInferenceSchema.safeParse(bad).success).toBe(false);
    });
});
