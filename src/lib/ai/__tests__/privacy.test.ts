import { describe, expect, it } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";

import { toAiColumns } from "../toAiColumns";

describe("AI payload privacy", () => {
    it("never serializes sample values or detector reasons", () => {
        const inferences: ColumnInference[] = [
            {
                confidence: 0.95,
                name: "patient_code",
                nullCount: 0,
                primaryType: "categorical",
                reasons: ["someReason"],
                sampleValues: ["P-1042", "P-1043"],
                semanticTag: "patient-id",
                uniqueCount: 2,
            },
        ];

        const payload = toAiColumns(inferences);
        const encoded = JSON.stringify(payload);

        expect(encoded).not.toContain("P-1042");
        expect(encoded).not.toContain("P-1043");
        expect(encoded).not.toContain("sampleValues");
        expect(encoded).not.toContain("reasons");
    });
});
