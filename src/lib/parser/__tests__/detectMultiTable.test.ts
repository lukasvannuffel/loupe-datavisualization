import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { detectMultiTable } from "../detectMultiTable";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

const fixtureAoa = (name: string): readonly (readonly string[])[] => {
    const csv = readFileSync(path.join(fixturesDir, name), "utf8").trim();

    return csv.split(/\r?\n/u).map((line) => line.split(","));
};

describe("detectMultiTable", () => {
    describe("horizontal_split", () => {
        /**
         * MUTATION-VERIFY
         * Mutation: `src/lib/parser/detectMultiTable.ts` changed `if (clusterSize >= 2)` to
         * `if (clusterSize >= 4)` in `countNonEmptyClusters`.
         * Red test: `detects side-by-side tables separated by empty column`.
         * Verified manually: 2026-06-02. REVERTED.
         */
        it("detects side-by-side tables separated by empty column", () => {
            const result = detectMultiTable(fixtureAoa("horizontal-split.csv"));

            expect(result.detected).toBe(true);
            expect(result).toMatchObject({ reason: "horizontal_split" });
        });

        /**
         * MUTATION-VERIFY
         * Mutation: `src/lib/parser/detectMultiTable.ts` changed
         * `headerCellsWithoutTrailingEmpties(aoa[0] ?? [])` to `(aoa[0] ?? [])` and relaxed sparse
         * fallback `headerClusters >= 2` to `headerClusters >= 1`, effectively removing trailing-gap
         * protection.
         * Red test: `does NOT detect trailing empty columns as split`.
         * Verified manually: 2026-06-02. REVERTED.
         */
        it("does NOT detect trailing empty columns as split", () => {
            const result = detectMultiTable(fixtureAoa("trailing-empty-cols.csv"));

            expect(result).toEqual({ detected: false });
        });

        it("does NOT trigger on single isolated non-empty cell after gap", () => {
            const result = detectMultiTable([["A", "B", "", "C", "", ""]]);

            expect(result).toEqual({ detected: false });
        });
    });

    describe("embedded_header / vertical_split", () => {
        it("detects stacked tables with second header row", () => {
            const result = detectMultiTable(fixtureAoa("vertical-stacked.csv"));

            expect(result.detected).toBe(true);
            expect(result).toMatchObject({ reason: "embedded_header" });
        });

        it("detects stacked tables when second header has digit-bearing labels", () => {
            const aoa = [
                ["subject_id", "iief_0", "12 months (n)"],
                ["S-001", "17", "24"],
                ["S-002", "21", "18"],
                ["subject_id", "iief_6", "24 months (n)"],
                ["S-003", "19", "12"],
                ["S-004", "15", "10"],
            ];

            const result = detectMultiTable(aoa);
            expect(result.detected).toBe(true);
            expect(result).toMatchObject({ reason: "embedded_header" });
        });

        it("does NOT trigger on a duplicate header repeat", () => {
            const aoa = [
                ["PatientID", "Age", "Group"],
                ["PatientID", "Age", "Group"],
                ["1", "45", "A"],
            ];

            const result = detectMultiTable(aoa);
            expect(result).toEqual({ detected: false });
        });

        it("does NOT trigger on valid Belgian decimal-comma rows", () => {
            const aoa = [
                [
                    "patient_id",
                    "treatment_group",
                    "age",
                    "sex",
                    "bmi",
                    "baseline_hba1c",
                    "week12_hba1c",
                    "hba1c_change",
                ],
                ["PT-1001", "Placebo", "63", "M", "37,6", "8,6", "8,4", "-0,16"],
                ["PT-1002", "Placebo", "39", "F", "29,5", "7,7", "7,5", "-0,16"],
            ];

            expect(detectMultiTable(aoa)).toEqual({ detected: false });
        });

        it("does NOT trigger on valid US thousands/decimal rows", () => {
            const aoa = [
                ["subject_id", "arm", "value", "delta"],
                ["S-001", "Control", "1234.56", "-12.50"],
                ["S-002", "Treatment", "2345.67", "7.25"],
            ];

            expect(detectMultiTable(aoa)).toEqual({ detected: false });
        });
    });

    describe("privacy invariant", () => {
        it("return object contains no cell values", () => {
            const result = detectMultiTable(fixtureAoa("horizontal-split.csv"));
            const serialized = JSON.stringify(result);

            expect(serialized).not.toContain("PatientID");
            expect(serialized).not.toContain("Age");
            expect(serialized).not.toContain("Group");
            expect(serialized).not.toContain("SubjectID");
            expect(serialized).not.toContain("Score");
            expect(serialized).not.toContain("Arm");
        });
    });

    describe("performance", () => {
        it("returns in <75ms on a 10k-row dataset", () => {
            const header = Array.from({ length: 20 }, (_, index) => `col_${index + 1}`);
            const dataRows = Array.from(
                { length: 10000 },
                (_, rowIndex) => header.map((_, colIndex) => String((rowIndex + 1) * (colIndex + 1))),
            );
            const aoa = [header, ...dataRows];

            const start = performance.now();
            const result = detectMultiTable(aoa);
            const elapsed = performance.now() - start;

            expect(result).toEqual({ detected: false });
            expect(elapsed).toBeLessThan(75);
        });
    });
});
