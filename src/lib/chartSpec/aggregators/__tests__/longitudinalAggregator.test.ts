import { describe, expect, it } from "vitest";

import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { aggregateLongitudinal } from "../longitudinalAggregator";
import { LongitudinalError } from "../xyPlot.types";

// Hand-computed longitudinal fixture (2 groups, 3 visits each):
// Group A: visit 1 = [10, 12, 14] → mean=12, sd=2,         sem=2/√3 ≈ 1.155
//          visit 2 = [13, 15, 17] → mean=15, sd=2,         sem=2/√3 ≈ 1.155
//          visit 3 = [16, 18, 20] → mean=18, sd=2,         sem=2/√3 ≈ 1.155
// Group B: visit 1 = [20, 22, 24] → mean=22, sd=2,         sem≈1.155
//          visit 2 = [25, 27, 29] → mean=27, sd=2,         sem≈1.155
//          visit 3 = [30, 32, 34] → mean=32, sd=2,         sem≈1.155
// SD is sample stddev (divisor n-1). Verified against np.std(x, ddof=1).

const longitudinalMapping: Mapping = { x: "visit", y: "value", group: "group" };

const handComputedRows = brandRows([
    { group: "A", visit: "1", value: "10" },
    { group: "A", visit: "1", value: "12" },
    { group: "A", visit: "1", value: "14" },
    { group: "A", visit: "2", value: "13" },
    { group: "A", visit: "2", value: "15" },
    { group: "A", visit: "2", value: "17" },
    { group: "A", visit: "3", value: "16" },
    { group: "A", visit: "3", value: "18" },
    { group: "A", visit: "3", value: "20" },
    { group: "B", visit: "1", value: "20" },
    { group: "B", visit: "1", value: "22" },
    { group: "B", visit: "1", value: "24" },
    { group: "B", visit: "2", value: "25" },
    { group: "B", visit: "2", value: "27" },
    { group: "B", visit: "2", value: "29" },
    { group: "B", visit: "3", value: "30" },
    { group: "B", visit: "3", value: "32" },
    { group: "B", visit: "3", value: "34" },
]);

describe("aggregateLongitudinal", () => {
    it("computes SEM correctly for n=3 fixture", () => {
        const data = aggregateLongitudinal(handComputedRows, longitudinalMapping);
        const groupA = data.groups.find((g) => g.label === "A");
        expect(groupA?.points).toHaveLength(3);
        expect(groupA?.points[0]?.mean).toBe(12);
        expect(groupA?.points[0]?.sem).toBeCloseTo(1.1547, 3);
        expect(groupA?.points[0]?.n).toBe(3);
    });

    it("handles single-patient visit with SEM=0", () => {
        const rows = brandRows([{ group: "A", visit: "1", value: "10" }]);
        const data = aggregateLongitudinal(rows, longitudinalMapping);
        expect(data.groups[0]?.points[0]?.n).toBe(1);
        expect(data.groups[0]?.points[0]?.sem).toBe(0);
        expect(Number.isFinite(data.groups[0]?.points[0]?.sem ?? NaN)).toBe(true);
    });

    it("handles single-group", () => {
        const rows = brandRows([
            { group: "A", visit: "1", value: "10" },
            { group: "A", visit: "2", value: "12" },
        ]);
        const data = aggregateLongitudinal(rows, longitudinalMapping);
        expect(data.groups).toHaveLength(1);
    });

    it("aggregates same visit across different patients", () => {
        const rows = brandRows([
            { group: "A", visit: "1", value: "10" },
            { group: "A", visit: "1", value: "14" },
        ]);
        const data = aggregateLongitudinal(rows, longitudinalMapping);
        expect(data.groups[0]?.points[0]?.mean).toBe(12);
        expect(data.groups[0]?.points[0]?.n).toBe(2);
    });

    it("throws on zero valid rows", () => {
        const rows = brandRows([{ group: "A", visit: "x", value: "y" }]);
        expect(() => aggregateLongitudinal(rows, longitudinalMapping)).toThrow(LongitudinalError);
    });

    it("throws on >4 groups", () => {
        const rows = brandRows(
            ["A", "B", "C", "D", "E"].map((group) => ({ group, visit: "1", value: "10" })),
        );
        expect(() => aggregateLongitudinal(rows, longitudinalMapping)).toThrow(/Max 4 groups/);
    });

    it("preserves insertion order across groups", () => {
        const rows = brandRows([
            { group: "B", visit: "1", value: "20" },
            { group: "A", visit: "1", value: "10" },
            { group: "C", visit: "1", value: "30" },
        ]);
        const data = aggregateLongitudinal(rows, longitudinalMapping);
        expect(data.groups.map((g) => g.label)).toEqual(["B", "A", "C"]);
    });

    it("drops rows with non-finite values before counting groups against cap", () => {
        const validLongitudinalRows = (group: string): Record<string, string>[] =>
            Array.from({ length: 3 }, (_, v) => ({
                group,
                visit: String(v + 1),
                value: String(10 + v),
            }));

        const rows = brandRows([
            ...validLongitudinalRows("A"),
            ...validLongitudinalRows("B"),
            ...validLongitudinalRows("C"),
            ...validLongitudinalRows("D"),
            { group: "E", visit: "1", value: "x" },
            { group: "E", visit: "2", value: "" },
        ]);
        const data = aggregateLongitudinal(rows, longitudinalMapping);
        expect(data.groups).toHaveLength(4);
        expect(data.groups.map((g) => g.label)).toEqual(["A", "B", "C", "D"]);
    });
});

describe("privacy: LongitudinalData contains no per-patient identifiers", () => {
    // MUTATION-VERIFY:
    //   In longitudinalAggregator.ts, temporarily add to LongitudinalPoint construction:
    //     patientIdsAtVisit: values.map((_, i) => `P${i}`),
    //   Re-run "serialized output has no patient identifiers or row keys".
    //   JSON contains "patientIdsAtVisit":["P0","P1",...] → /patientId/i matches → test RED.
    //   Verified manually: 2026-05-24. REVERTED.

    it("serialized output has no patient identifiers or row keys", () => {
        const rows = brandRows(
            Array.from({ length: 4 }, (_, p) =>
                Array.from({ length: 3 }, (_, v) => ({
                    patientId: `P${p}`,
                    visit: String(v + 1),
                    value: String(10 + p + v),
                    group: p < 2 ? "A" : "B",
                })),
            ).flat(),
        );
        const data = aggregateLongitudinal(rows, longitudinalMapping);
        const json = JSON.stringify(data);

        expect(json).not.toMatch(/patientId/i);
        expect(json).not.toMatch(/subjectId/i);
        expect(json).not.toMatch(/rowIndi[cx]/i);
        expect(json).not.toMatch(/recordId/i);
        expect(json).not.toMatch(/"P0"|"P1"|"P2"|"P3"/);
    });

    it("output point count is bounded by unique visits per group, not patient rows", () => {
        const rows = brandRows(
            Array.from({ length: 4 }, (_, p) =>
                Array.from({ length: 3 }, (_, v) => ({
                    patientId: `P${p}`,
                    visit: String(v + 1),
                    value: String(10 + p + v),
                    group: "A",
                })),
            ).flat(),
        );
        const data = aggregateLongitudinal(rows, longitudinalMapping);
        expect(data.groups[0]?.points).toHaveLength(3);
        expect(data.kind).toBe("longitudinal");
    });
});

// MUTATION-VERIFY:
//   In longitudinalAggregator.ts, change `sd / Math.sqrt(n)` to `sd / n`.
//   Re-run "computes SEM correctly for n=3 fixture".
//   Expected sem ≈ 1.155 becomes 0.667 → test RED.
//   Verified manually: 2026-05-24. REVERTED.
