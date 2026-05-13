import { describe, expect, it } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";

import { toAiColumns } from "../toAiColumns";

describe("toAiColumns", () => {
    it("drops sampleValues and other ColumnInference-only fields", () => {
        const inference: ColumnInference = {
            confidence: 0.9,
            name: "subject_ref",
            nullCount: 0,
            primaryType: "categorical",
            reasons: ["detector"],
            sampleValues: ["P-1042", "P-1043"],
            semanticTag: "patient-id",
            uniqueCount: 2,
        };

        const output = toAiColumns([inference]);

        expect(Object.keys(output[0] ?? {})).toEqual([
            "name",
            "primaryType",
            "semanticTag",
            "nullCount",
            "uniqueCount",
        ]);
        expect(output[0]?.name).toBe("subject_ref");
    });

    it("keeps semanticTag only when defined", () => {
        const withoutTag: ColumnInference = {
            confidence: 1,
            name: "score",
            nullCount: 0,
            primaryType: "numeric",
            reasons: [],
            sampleValues: [],
            uniqueCount: 10,
        };

        const withTag: ColumnInference = {
            ...withoutTag,
            name: "days",
            semanticTag: "time-to-event",
        };

        const outA = toAiColumns([withoutTag])[0];
        const outB = toAiColumns([withTag])[0];

        expect(Object.keys(outA ?? {})).not.toContain("semanticTag");
        expect(outB?.semanticTag).toBe("time-to-event");
    });

    it("surfaces readonly ai columns at the type level", () => {
        const out = toAiColumns([
            {
                confidence: 1,
                name: "n",
                nullCount: 0,
                primaryType: "integer",
                reasons: [],
                sampleValues: [],
                uniqueCount: 5,
            },
        ]);

        expect(out).toHaveLength(1);

        // @ts-expect-error AiColumn rows are readonly from inference results
        out[0]!.name = "mutated";
    });
});
