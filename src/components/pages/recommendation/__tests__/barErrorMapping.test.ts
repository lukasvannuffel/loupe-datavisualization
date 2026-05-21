import { describe, expect, it } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";

import { mappingForBarError } from "../barErrorMapping";

const col = (over: Partial<ColumnInference> & Pick<ColumnInference, "name" | "primaryType">): ColumnInference => ({
    confidence: 1,
    reasons: [],
    nullCount: 0,
    uniqueCount: 10,
    sampleValues: [],
    ...over,
});

describe("mappingForBarError", () => {
    it("returns mapping unchanged when group and outcome are set", () => {
        const mapping = { group: "arm", outcome: "bp_change" };
        expect(mappingForBarError(mapping, [])).toEqual(mapping);
    });

    it("infers outcome from first numeric when group is mapped", () => {
        const mapping = { group: "treatment_arm" };
        const inferences = [
            col({ name: "treatment_arm", primaryType: "categorical" }),
            col({ name: "bp_reduction", primaryType: "numeric" }),
        ];
        expect(mappingForBarError(mapping, inferences)).toEqual({
            group: "treatment_arm",
            outcome: "bp_reduction",
        });
    });
});
