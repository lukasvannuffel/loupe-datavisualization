import { describe, expect, it } from "vitest";

import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { aggregateBoxPlot } from "../boxPlot";
import { BoxPlotError } from "../boxPlot.types";
import { irisRows } from "./irisSepalWidth.fixture";

const irisMapping: Mapping = { group: "species", outcome: "sepalWidth" };
const valueGroupMapping: Mapping = { group: "group", outcome: "value" };

const expectNoJoinableFields = (json: string): void => {
    expect(json).not.toMatch(/patientId/i);
    expect(json).not.toMatch(/rowIndi[cx]/i);
    expect(json).not.toMatch(/recordId/i);
    expect(json).not.toMatch(/subjectId/i);
    expect(json).not.toMatch(/"id":\s*"/);
    expect(json).not.toMatch(/"id":\s*\d/);
};

const validRowsFor = (group: string): readonly Record<string, string>[] =>
    Array.from({ length: 5 }, (_, i) => ({ group, value: String(i + 1) }));

// iris Sepal.Width by Species — Q1/median/Q3 verified against:
//   >>> from sklearn.datasets import load_iris
//   >>> import numpy as np
//   >>> iris = load_iris()
//   >>> data = iris.data[:, 1]  # Sepal.Width
//   >>> labels = iris.target_names[iris.target]
//   >>> for s in ['setosa', 'versicolor', 'virginica']:
//   ...     vals = data[labels == s]
//   ...     print(s, np.percentile(vals, [25, 50, 75], method='linear'))
//   setosa     [3.2,  3.4, 3.675]
//   versicolor [2.525, 2.8, 3.0]
//   virginica  [2.8,   3.0, 3.175]
// Tolerance: ±0.005.
//
// MUTATION-VERIFY: change (n - 1) * p to n * p in quantileType7.ts;
// test "matches numpy quartiles for iris Sepal.Width by Species" must red. REVERTED.

describe("aggregateBoxPlot", () => {
    it("matches numpy quartiles for iris Sepal.Width by Species", () => {
        const data = aggregateBoxPlot(brandRows([...irisRows()]), irisMapping);
        const setosa = data.groups.find((g) => g.label === "setosa");
        const versicolor = data.groups.find((g) => g.label === "versicolor");
        const virginica = data.groups.find((g) => g.label === "virginica");

        expect(setosa?.kind).toBe("box");
        expect(versicolor?.kind).toBe("box");
        expect(virginica?.kind).toBe("box");

        if (setosa?.kind === "box") {
            expect(setosa.q1).toBeCloseTo(3.2, 3);
            expect(setosa.median).toBeCloseTo(3.4, 3);
            expect(setosa.q3).toBeCloseTo(3.675, 3);
            expect(setosa.n).toBe(50);
        }
        if (versicolor?.kind === "box") {
            expect(versicolor.q1).toBeCloseTo(2.525, 3);
            expect(versicolor.median).toBeCloseTo(2.8, 3);
            expect(versicolor.q3).toBeCloseTo(3.0, 3);
        }
        if (virginica?.kind === "box") {
            expect(virginica.q1).toBeCloseTo(2.8, 3);
            expect(virginica.median).toBeCloseTo(3.0, 3);
            expect(virginica.q3).toBeCloseTo(3.175, 3);
        }
    });

    it("emits strip mode for groups with n < 5", () => {
        const rows = brandRows([
            { group: "A", value: "1" },
            { group: "A", value: "2" },
            { group: "A", value: "3" },
            ...Array.from({ length: 50 }, (_, i) => ({
                group: "B",
                value: String(i + 1),
            })),
        ]);
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        const groupA = data.groups.find((g) => g.label === "A");
        const groupB = data.groups.find((g) => g.label === "B");

        expect(groupA?.kind).toBe("strip");
        if (groupA?.kind === "strip") {
            expect(groupA.n).toBe(3);
            expect(groupA.values).toEqual([1, 2, 3]);
        }
        expect(groupB?.kind).toBe("box");
    });

    it("renders strip mode at exactly n=4 (boundary below MIN_N_FOR_BOX)", () => {
        const rows = brandRows(
            Array.from({ length: 4 }, (_, i) => ({ value: String(i + 1), group: "A" })),
        );
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        expect(data.groups).toHaveLength(1);
        expect(data.groups[0]?.kind).toBe("strip");
        if (data.groups[0]?.kind === "strip") {
            expect(data.groups[0].n).toBe(4);
            expect(data.groups[0].values).toEqual([1, 2, 3, 4]);
        }
    });

    it("renders box mode at exactly n=5 (boundary at MIN_N_FOR_BOX)", () => {
        const rows = brandRows(
            Array.from({ length: 5 }, (_, i) => ({ value: String(i + 1), group: "A" })),
        );
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        expect(data.groups).toHaveLength(1);
        expect(data.groups[0]?.kind).toBe("box");
        if (data.groups[0]?.kind === "box") {
            expect(data.groups[0].n).toBe(5);
            // numpy.percentile([1,2,3,4,5], [25, 50, 75], method='linear') = [2.0, 3.0, 4.0]
            expect(data.groups[0].q1).toBeCloseTo(2.0, 3);
            expect(data.groups[0].median).toBeCloseTo(3.0, 3);
            expect(data.groups[0].q3).toBeCloseTo(4.0, 3);
        }
    });

    it("handles all-identical values without NaN", () => {
        const rows = brandRows(Array.from({ length: 6 }, () => ({ value: "5" })));
        const data = aggregateBoxPlot(rows, { outcome: "value" });
        const group = data.groups[0];

        expect(group?.kind).toBe("box");
        if (group?.kind === "box") {
            expect(group.q1).toBe(5);
            expect(group.median).toBe(5);
            expect(group.q3).toBe(5);
            expect(group.min).toBe(5);
            expect(group.max).toBe(5);
            expect(group.outliers).toEqual([]);
            expect(Number.isFinite(group.notchLower)).toBe(true);
        }
    });

    it("handles single-patient group as strip stats", () => {
        const rows = brandRows([{ group: "solo", value: "42" }]);
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        const group = data.groups[0];

        expect(group?.kind).toBe("strip");
        if (group?.kind === "strip") {
            expect(group.n).toBe(1);
            expect(group.values).toEqual([42]);
        }
    });

    it("drops groups with all-invalid values rather than counting them toward GROUP_CAP", () => {
        const rows = brandRows([
            ...validRowsFor("A"),
            ...validRowsFor("B"),
            ...validRowsFor("C"),
            ...validRowsFor("D"),
            { group: "E", value: "not-a-number" },
            { group: "E", value: "" },
        ]);
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        expect(data.groups).toHaveLength(4);
        expect(data.groups.map((g) => g.label)).toEqual(["A", "B", "C", "D"]);
    });

    it("throws on zero valid values across all groups", () => {
        const rows = brandRows([
            { value: "not-a-number", group: "A" },
            { value: "", group: "B" },
        ]);
        expect(() => aggregateBoxPlot(rows, valueGroupMapping)).toThrow(BoxPlotError);
        expect(() => aggregateBoxPlot(rows, valueGroupMapping)).toThrow(/no valid numeric values/i);
    });

    it("throws on >4 groups", () => {
        const rows = brandRows([
            { group: "A", value: "1" },
            { group: "B", value: "2" },
            { group: "C", value: "3" },
            { group: "D", value: "4" },
            { group: "E", value: "5" },
            { group: "A", value: "6" },
            { group: "B", value: "7" },
            { group: "C", value: "8" },
            { group: "D", value: "9" },
            { group: "E", value: "10" },
            { group: "A", value: "11" },
            { group: "B", value: "12" },
            { group: "C", value: "13" },
            { group: "D", value: "14" },
            { group: "E", value: "15" },
            { group: "A", value: "16" },
            { group: "B", value: "17" },
            { group: "C", value: "18" },
            { group: "D", value: "19" },
            { group: "E", value: "20" },
            { group: "A", value: "21" },
            { group: "B", value: "22" },
            { group: "C", value: "23" },
            { group: "D", value: "24" },
            { group: "E", value: "25" },
        ]);
        expect(() => aggregateBoxPlot(rows, valueGroupMapping)).toThrow(/Max 4 groups/);
    });

    it("preserves CSV insertion order across groups", () => {
        const rows = brandRows([
            { group: "B", value: "10" },
            { group: "B", value: "11" },
            { group: "B", value: "12" },
            { group: "B", value: "13" },
            { group: "B", value: "14" },
            { group: "A", value: "1" },
            { group: "A", value: "2" },
            { group: "A", value: "3" },
            { group: "A", value: "4" },
            { group: "A", value: "5" },
            { group: "C", value: "20" },
            { group: "C", value: "21" },
            { group: "C", value: "22" },
            { group: "C", value: "23" },
            { group: "C", value: "24" },
        ]);
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        expect(data.groups.map((g) => g.label)).toEqual(["B", "A", "C"]);
    });

    it("preserves both box and strip outputs in mixed-n datasets", () => {
        const rows = brandRows([
            { group: "small", value: "1" },
            { group: "small", value: "2" },
            { group: "large", value: "10" },
            { group: "large", value: "11" },
            { group: "large", value: "12" },
            { group: "large", value: "13" },
            { group: "large", value: "14" },
        ]);
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        const kinds = data.groups.map((g) => g.kind);

        expect(kinds).toEqual(["strip", "box"]);
    });
});

describe("privacy: BoxPlotData contains no per-patient joinable fields", () => {
    // MUTATION-VERIFY:
    //   In BoxStats construction (boxPlot.ts ~L47), temporarily add:
    //     outlierRowIndex: sorted.map((_, i) => i)
    //   Re-run tests "serialized output has no row IDs or patient keys" and
    //   "strip mode emits only bare numeric values, no row-level metadata".
    //   JSON serialization includes "outlierRowIndex":[0,1,...] which contains
    //   the substring "rowIndex" (case-insensitive). The /rowIndex/i regex catches
    //   it → both tests RED.
    //   Verified manually: 2026-05-24. REVERTED.

    it("serialized output has no row IDs or patient keys", () => {
        const data = aggregateBoxPlot(brandRows([...irisRows()]), irisMapping);
        expectNoJoinableFields(JSON.stringify(data));
    });

    it("strip mode emits only bare numeric values, no row-level metadata", () => {
        const rows = brandRows([
            ...Array.from({ length: 50 }, (_, i) => ({ value: String(i + 1), group: "big" })),
            { value: "1.0", group: "small" },
            { value: "2.0", group: "small" },
            { value: "3.0", group: "small" },
        ]);
        const data = aggregateBoxPlot(rows, valueGroupMapping);
        expectNoJoinableFields(JSON.stringify(data));

        const stripGroup = data.groups.find((g) => g.kind === "strip");
        expect(stripGroup).toBeDefined();
        if (stripGroup?.kind === "strip") {
            for (const value of stripGroup.values) {
                expect(typeof value).toBe("number");
                expect(Number.isFinite(value)).toBe(true);
            }
        }
    });

    it("outliers array contains only bare numbers", () => {
        const rows = brandRows([
            ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1) })),
            { value: "100" },
        ]);
        const data = aggregateBoxPlot(rows, { outcome: "value" });
        for (const g of data.groups) {
            if (g.kind === "box") {
                for (const o of g.outliers) {
                    expect(typeof o).toBe("number");
                    expect(Number.isFinite(o)).toBe(true);
                }
            }
        }
    });
});
