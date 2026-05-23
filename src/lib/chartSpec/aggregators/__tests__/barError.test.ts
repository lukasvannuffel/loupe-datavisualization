import { describe, expect, it, vi } from "vitest";

import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { aggregateBarError, parseNumericCell } from "../barError";

const mapping: Mapping = { group: "arm", outcome: "outcome" };

describe("aggregateBarError", () => {
    it("aggregates a simple two-group case", () => {
        const rows = brandRows([
            { arm: "A", outcome: "10" },
            { arm: "A", outcome: "12" },
            { arm: "B", outcome: "20" },
            { arm: "B", outcome: "22" },
        ]);
        const { groups } = aggregateBarError(rows, mapping);
        const a = groups.find((g) => g.label === "A");
        const b = groups.find((g) => g.label === "B");
        expect(a?.mean).toBeCloseTo(11, 5);
        expect(b?.mean).toBeCloseTo(21, 5);
        expect(a?.n).toBe(2);
        expect(a?.sd).toBeCloseTo(1.41421356, 4);
    });

    it("aggregates 100 rows across 4 groups with pinned G0 mean", () => {
        const raw: Record<string, string>[] = [];
        for (let i = 0; i < 100; i++) {
            raw.push({ arm: `G${i % 4}`, outcome: String(i % 10) });
        }
        const { groups } = aggregateBarError(brandRows(raw), mapping);
        expect(groups).toHaveLength(4);
        const g0 = groups.find((g) => g.label === "G0");
        expect(g0?.n).toBe(25);
        expect(g0?.mean).toBe(4);
    });

    it("uses Bessel correction for sample SD", () => {
        const rows = brandRows([
            { arm: "S", outcome: "2" },
            { arm: "S", outcome: "4" },
            { arm: "S", outcome: "4" },
            { arm: "S", outcome: "4" },
            { arm: "S", outcome: "5" },
            { arm: "S", outcome: "5" },
            { arm: "S", outcome: "7" },
            { arm: "S", outcome: "9" },
        ]);
        const { groups } = aggregateBarError(rows, mapping);
        expect(groups[0]?.mean).toBeCloseTo(5, 5);
        expect(groups[0]?.sd).toBeCloseTo(2.138089935, 3);
    });

    it("drops rows with missing outcome", () => {
        const rows = brandRows(
            Array.from({ length: 10 }, (_, i) => ({
                arm: "A",
                outcome: i < 7 ? String(i) : "",
            })),
        );
        const { groups, missing } = aggregateBarError(rows, mapping);
        expect(groups[0]?.n).toBe(7);
        expect(missing.missingOutcomeRows).toBe(3);
        expect(missing.droppedRows).toBe(3);
        expect(missing.dropRate).toBeCloseTo(0.3, 5);
    });

    it("drops rows with missing group", () => {
        const rows = brandRows(
            Array.from({ length: 10 }, (_, i) => ({
                arm: i < 8 ? "A" : "",
                outcome: "1",
            })),
        );
        const { missing } = aggregateBarError(rows, mapping);
        expect(missing.missingGroupRows).toBe(2);
        expect(missing.droppedRows).toBe(2);
    });

    it("counts both-missing row in both tallies but once in droppedRows", () => {
        const rows = brandRows([
            { arm: "A", outcome: "1" },
            { arm: "", outcome: "" },
        ]);
        const { missing } = aggregateBarError(rows, mapping);
        expect(missing.droppedRows).toBe(1);
        expect(missing.missingGroupRows).toBe(1);
        expect(missing.missingOutcomeRows).toBe(1);
    });

    it("treats whitespace-only cells as missing", () => {
        const rows = brandRows([
            { arm: "A", outcome: "10" },
            { arm: " ", outcome: "5" },
            { arm: "A", outcome: " " },
        ]);
        const { groups, missing } = aggregateBarError(rows, mapping);
        expect(groups).toHaveLength(1);
        expect(groups[0]?.n).toBe(1);
        expect(missing.missingOutcomeRows).toBe(1);
        expect(missing.missingGroupRows).toBe(1);
        expect(missing.droppedRows).toBe(2);
    });

    it("parses European decimal commas", () => {
        expect(parseNumericCell("12,5")).toBeCloseTo(12.5, 5);
        const rows = brandRows([{ arm: "A", outcome: "12,5" }]);
        const { groups } = aggregateBarError(rows, mapping);
        expect(groups[0]?.mean).toBeCloseTo(12.5, 5);
    });

    it("parses US thousand separators", () => {
        expect(parseNumericCell("1,234")).toBe(1234);
        expect(parseNumericCell("1,234.5")).toBeCloseTo(1234.5, 5);
    });

    it("coerces string numerics and treats non-numeric as missing", () => {
        const rows = brandRows([
            { arm: "A", outcome: "12.5" },
            { arm: "A", outcome: "abc" },
            { arm: "A", outcome: "10" },
        ]);
        const { groups } = aggregateBarError(rows, mapping);
        expect(groups[0]?.n).toBe(2);
        expect(groups[0]?.mean).toBeCloseTo(11.25, 5);
    });

    it("returns empty groups for empty rows", () => {
        const { groups, missing } = aggregateBarError(brandRows([]), mapping);
        expect(groups).toEqual([]);
        expect(missing.totalRows).toBe(0);
    });

    it("returns empty groups when mapping is incomplete", () => {
        const rows = brandRows([{ arm: "A", outcome: "1" }]);
        expect(aggregateBarError(rows, { group: "arm" }).groups).toEqual([]);
        expect(aggregateBarError(rows, { outcome: "outcome" }).groups).toEqual([]);
    });

    it("returns sd=0 for single-row groups", () => {
        const rows = brandRows([{ arm: "solo", outcome: "5" }]);
        const { groups } = aggregateBarError(rows, mapping);
        expect(groups[0]?.sd).toBe(0);
        expect(groups[0]?.n).toBe(1);
    });

    it("sorts groups alphabetically by label", () => {
        const rows = brandRows([
            { arm: "Z", outcome: "1" },
            { arm: "A", outcome: "2" },
            { arm: "M", outcome: "3" },
        ]);
        const labels = aggregateBarError(rows, mapping).groups.map((g) => g.label);
        expect(labels).toEqual(["A", "M", "Z"]);
    });

    it("never calls fetch during aggregation", () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
        aggregateBarError(brandRows([{ arm: "A", outcome: "1" }]), mapping);
        expect(fetchSpy).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
