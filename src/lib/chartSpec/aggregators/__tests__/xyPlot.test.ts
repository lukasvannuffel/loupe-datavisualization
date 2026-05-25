import { describe, expect, it } from "vitest";

import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { aggregateXYPlot } from "../xyPlot";
import { XYPlotError } from "../xyPlot.types";

const columnMap: Mapping = { x: "x", y: "y", group: "group" };

const twentyPatientFixture = brandRows(
    Array.from({ length: 20 }, (_, i) => ({
        group: i % 2 === 0 ? "A" : "B",
        x: String(i),
        y: String(i * 2),
        patientId: `p${i}`,
    })),
);

describe("passthrough behavior", () => {
    it("preserves CSV insertion order across groups", () => {
        const rows = brandRows([
            { group: "B", x: "1", y: "2" },
            { group: "A", x: "1", y: "3" },
            { group: "C", x: "1", y: "4" },
        ]);
        const data = aggregateXYPlot(rows, columnMap, { computeRegression: false });
        expect(data.groups.map((g) => g.label)).toEqual(["B", "A", "C"]);
    });

    it("sorts points within each group by x ascending", () => {
        const rows = brandRows([
            { group: "A", x: "3", y: "1" },
            { group: "A", x: "1", y: "2" },
            { group: "A", x: "2", y: "3" },
        ]);
        const data = aggregateXYPlot(rows, columnMap, { computeRegression: false });
        expect(data.groups[0]?.points.map((p) => p.x)).toEqual([1, 2, 3]);
    });

    it("drops rows with non-finite x or y BEFORE counting groups against cap", () => {
        const rows = brandRows([
            { group: "A", x: "1", y: "2" },
            { group: "B", x: "1", y: "3" },
            { group: "C", x: "1", y: "4" },
            { group: "D", x: "1", y: "5" },
            { group: "NaN", x: "x", y: "y" },
            { group: "E", x: "", y: "" },
        ]);
        const data = aggregateXYPlot(rows, columnMap, { computeRegression: false });
        expect(data.groups).toHaveLength(4);
    });
});

describe("regression integration", () => {
    // MUTATION-VERIFY:
    //   In xyPlot.ts, change `regressionSkipped = true` to `regressionSkipped = false`
    //   inside the `if (fit === null)` branch.
    //   Re-run "skips regression and sets regressionSkipped=true when any group has n<3".
    //   Expected `regressionSkipped: true` becomes `false` → test RED.
    //   Verified manually: 2026-05-24. REVERTED.

    it("skips regression and sets regressionSkipped=true when any group has n<3", () => {
        const rows = brandRows([
            ...Array.from({ length: 20 }, (_, i) => ({
                group: "Big",
                x: String(i),
                y: String(i + 1),
            })),
            { group: "Tiny", x: "1", y: "2" },
            { group: "Tiny", x: "2", y: "3" },
        ]);
        const data = aggregateXYPlot(rows, columnMap, { computeRegression: true });
        expect(data.regressions.some((r) => r.label === "Big")).toBe(true);
        expect(data.regressions.some((r) => r.label === "Tiny")).toBe(false);
        expect(data.regressionSkipped).toBe(true);
    });

    it("does not compute regression when options.computeRegression is false", () => {
        const rows = brandRows(
            Array.from({ length: 50 }, (_, i) => ({
                group: "A",
                x: String(i),
                y: String(i + 1),
            })),
        );
        const data = aggregateXYPlot(rows, columnMap, { computeRegression: false });
        expect(data.regressions).toHaveLength(0);
        expect(data.regressionSkipped).toBe(false);
    });
});

describe("edge cases", () => {
    it("handles single-point group via regressionSkipped flag", () => {
        const rows = brandRows([{ group: "A", x: "1", y: "2" }]);
        const data = aggregateXYPlot(rows, columnMap, { computeRegression: true });
        expect(data.regressionSkipped).toBe(true);
        expect(data.regressions).toHaveLength(0);
    });

    it("handles all-x-identical group via null regression (vertical line)", () => {
        const rows = brandRows([
            { group: "A", x: "5", y: "1" },
            { group: "A", x: "5", y: "2" },
            { group: "A", x: "5", y: "3" },
        ]);
        const data = aggregateXYPlot(rows, columnMap, { computeRegression: true });
        expect(data.regressionSkipped).toBe(true);
        expect(data.regressions).toHaveLength(0);
    });

    it("throws on >4 groups", () => {
        const rows = brandRows(
            ["A", "B", "C", "D", "E"].map((group) => ({ group, x: "1", y: "2" })),
        );
        expect(() => aggregateXYPlot(rows, columnMap, { computeRegression: false })).toThrow(
            XYPlotError,
        );
        expect(() => aggregateXYPlot(rows, columnMap, { computeRegression: false })).toThrow(
            /Max 4 groups/,
        );
    });

    it("throws on zero valid rows", () => {
        const rows = brandRows([{ group: "A", x: "x", y: "y" }]);
        expect(() => aggregateXYPlot(rows, columnMap, { computeRegression: false })).toThrow(
            /No valid \(x, y\) pairs/,
        );
    });
});

describe("privacy", () => {
    it("serialized output contains no patient identifiers", () => {
        const data = aggregateXYPlot(twentyPatientFixture, columnMap, { computeRegression: true });
        const json = JSON.stringify(data);
        expect(json).not.toMatch(/patientId/i);
        expect(json).not.toMatch(/subjectId/i);
        expect(json).not.toMatch(/rowIndi[cx]/i);
        expect(json).not.toMatch(/recordId/i);
    });
});
