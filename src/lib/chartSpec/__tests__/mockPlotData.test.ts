import { describe, expect, it } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";

import { mockPlotDataFromInferences } from "../mockPlotData";
import { plotDataSchema } from "../schemas";
import type { ChartSpec, PlotData } from "../types";

const ALL_KINDS: readonly ChartSpec["kind"][] = ["km", "barError", "box", "xy"];

const sampleInferences: readonly ColumnInference[] = [
    {
        name: "treatment",
        primaryType: "categorical",
        confidence: 0.9,
        reasons: [],
        nullCount: 0,
        uniqueCount: 3,
        sampleValues: ["Drug", "Placebo", "Control", "Extra"],
    },
    {
        name: "score",
        primaryType: "numeric",
        confidence: 0.95,
        reasons: [],
        nullCount: 0,
        uniqueCount: 50,
        sampleValues: ["1.2", "3.4"],
    },
];

describe("mockPlotDataFromInferences", () => {
    it.each(ALL_KINDS)("returns plot data whose kind matches %s", (kind) => {
        const data = mockPlotDataFromInferences(sampleInferences, kind);
        expect(data.kind).toBe(kind);
        expect(plotDataSchema.safeParse(data).success).toBe(true);
    });

    it("uses the first categorical column for barError labels", () => {
        const data = mockPlotDataFromInferences(sampleInferences, "barError");
        if (data.kind !== "barError") {
            throw new Error("expected barError");
        }
        expect(data.categories.map((c) => c.label)).toEqual(["Drug", "Placebo", "Control", "Extra"]);
    });

    it("falls back to default groups when no categorical column exists", () => {
        const numericOnly: readonly ColumnInference[] = [
            {
                name: "value",
                primaryType: "numeric",
                confidence: 1,
                reasons: [],
                nullCount: 0,
                uniqueCount: 10,
                sampleValues: ["1"],
            },
        ];
        const data = mockPlotDataFromInferences(numericOnly, "barError");
        expect(data.kind).toBe("barError");
        if (data.kind === "barError") {
            expect(data.categories.map((c) => c.label)).toEqual(["A", "B", "C"]);
        }
    });

    it("produces schema-valid plot data for every kind", () => {
        const results: PlotData[] = ALL_KINDS.map((kind) =>
            mockPlotDataFromInferences([], kind),
        );
        results.forEach((data) => {
            expect(plotDataSchema.parse(data).kind).toBe(data.kind);
        });
    });
});
