import { describe, expect, it } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";
import { brandRows } from "@/lib/parser/types";
import type { PrivateRows } from "@/lib/parser/types";

import { detectLongitudinal, MAX_X_UNIQUE_VALUES } from "../detectLongitudinal";

const col = (partial: Partial<ColumnInference> & Pick<ColumnInference, "name">): ColumnInference => ({
    confidence: 1,
    nullCount: 0,
    primaryType: "numeric",
    reasons: [],
    sampleValues: [],
    uniqueCount: 10,
    ...partial,
});

const buildGlp1Shape = (): { rows: PrivateRows; columns: readonly ColumnInference[] } => {
    const patientCount = 60;
    const visits = [0, 3, 6, 9, 12];
    const rows: Record<string, string>[] = [];
    for (let patient = 0; patient < patientCount; patient += 1) {
        for (const visit of visits) {
            if (patient % 10 === 0 && visit === 12) {
                continue;
            }
            rows.push({
                hba1c_percent: String(8 - visit * 0.05 + (patient % 2)),
                patient_id: `P${patient}`,
                treatment_arm: patient % 2 === 0 ? "GLP-1 RA" : "Standard care",
                visit_month: String(visit),
            });
        }
    }

    return {
        columns: [
            col({
                name: "patient_id",
                primaryType: "categorical",
                semanticTag: "patient-id",
                uniqueCount: patientCount,
            }),
            col({
                name: "treatment_arm",
                primaryType: "categorical",
                uniqueCount: 2,
            }),
            col({ name: "visit_month", uniqueCount: visits.length }),
            col({ name: "hba1c_percent", uniqueCount: 40 }),
        ],
        rows: brandRows(rows),
    };
};

describe("detectLongitudinal", () => {
    it("detects longitudinal structure on the glp1_trial_hba1c shape", () => {
        const { rows, columns } = buildGlp1Shape();
        const result = detectLongitudinal(
            rows,
            columns,
            "visit_month",
            "hba1c_percent",
            "treatment_arm",
        );
        expect(result.isLongitudinal).toBe(true);
        if (result.isLongitudinal) {
            expect(result.idColumn).toBe("patient_id");
        }
    });

    it("rejects a true scatter (LDL vs CIMT): id repeats too rarely", () => {
        const rows = brandRows(
            Array.from({ length: 120 }, (_, index) => ({
                cimt_mm: String(0.8 + index * 0.001),
                ldl_cholesterol: String(100 + index),
                patient_id: `P${index}`,
                smoker: index % 2 === 0 ? "Yes" : "No",
            })),
        );
        const columns: readonly ColumnInference[] = [
            col({
                name: "patient_id",
                primaryType: "categorical",
                semanticTag: "patient-id",
                uniqueCount: 120,
            }),
            col({ name: "smoker", primaryType: "binary", uniqueCount: 2 }),
            col({ name: "ldl_cholesterol", uniqueCount: 120 }),
            col({ name: "cimt_mm", uniqueCount: 120 }),
        ];
        const result = detectLongitudinal(
            rows,
            columns,
            "ldl_cholesterol",
            "cimt_mm",
            "smoker",
        );
        expect(result.isLongitudinal).toBe(false);
    });

    // MUTATION-VERIFY:
    //   In detectLongitudinal.ts, change MAX_X_UNIQUE_VALUES from 10 to 100.
    //   Re-run "rejects when x has too many unique values (likely continuous)".
    //   11 unique x-values previously rejected (11 > 10) would now pass (11 < 100) → test RED.
    //   Verified manually: 2026-05-24. REVERTED.
    it("rejects when x has too many unique values (likely continuous)", () => {
        const patientCount = 10;
        const visitCount = 11;
        const rows = brandRows(
            Array.from({ length: patientCount * visitCount }, (_, index) => ({
                cimt_mm: "1",
                patient_id: `P${index % patientCount}`,
                systolic_bp: String(index % visitCount),
            })),
        );
        const columns: readonly ColumnInference[] = [
            col({ name: "patient_id", primaryType: "categorical", uniqueCount: patientCount }),
            col({ name: "systolic_bp", uniqueCount: visitCount }),
            col({ name: "cimt_mm", uniqueCount: 1 }),
        ];
        const result = detectLongitudinal(rows, columns, "systolic_bp", "cimt_mm", null);
        expect(result.isLongitudinal).toBe(false);
    });

    it("rejects when no column qualifies as id (only numeric columns)", () => {
        const rows = brandRows(
            Array.from({ length: 30 }, (_, index) => ({
                x: String(index % 5),
                y: String(index),
            })),
        );
        const columns: readonly ColumnInference[] = [
            col({ name: "x", uniqueCount: 5 }),
            col({ name: "y", uniqueCount: 30 }),
        ];
        const result = detectLongitudinal(rows, columns, "x", "y", null);
        expect(result.isLongitudinal).toBe(false);
    });

    it("rejects when (id, x) pairs duplicate substantially (not repeated measures)", () => {
        const rows = brandRows(
            Array.from({ length: 100 }, (_, index) => ({
                arm: index % 2 === 0 ? "A" : "B",
                patient_id: `P${index % 5}`,
                value: String(index),
                visit: String(index % 5),
            })),
        );
        const columns: readonly ColumnInference[] = [
            col({ name: "patient_id", primaryType: "categorical", uniqueCount: 5 }),
            col({ name: "visit", uniqueCount: 5 }),
            col({ name: "value", uniqueCount: 100 }),
            col({ name: "arm", primaryType: "categorical", uniqueCount: 2 }),
        ];
        const result = detectLongitudinal(rows, columns, "visit", "value", "arm");
        expect(result.isLongitudinal).toBe(false);
    });

    it("allows up to 15% dropout/missingness in (id × visit) coverage", () => {
        const patientCount = 60;
        const visits = [0, 3, 6, 9, 12];
        const expected = patientCount * visits.length;
        const actual = Math.round(expected * 0.9);
        const rows = brandRows(
            Array.from({ length: expected }, (_, index) => {
                const patient = Math.floor(index / visits.length);
                const visit = visits[index % visits.length]!;
                return {
                    arm: patient % 2 === 0 ? "A" : "B",
                    patient_id: `P${patient}`,
                    value: "7.5",
                    visit_month: String(visit),
                };
            }).slice(0, actual),
        );
        const columns: readonly ColumnInference[] = [
            col({
                name: "patient_id",
                primaryType: "categorical",
                semanticTag: "patient-id",
                uniqueCount: patientCount,
            }),
            col({ name: "arm", primaryType: "categorical", uniqueCount: 2 }),
            col({ name: "visit_month", uniqueCount: visits.length }),
            col({ name: "value", uniqueCount: 10 }),
        ];
        const result = detectLongitudinal(rows, columns, "visit_month", "value", "arm");
        expect(result.isLongitudinal).toBe(true);
    });

    it("rejects ldl_cimt_cohort shape (cross-sectional scatter, not longitudinal)", () => {
        const rows = brandRows(
            Array.from({ length: 120 }, (_, index) => ({
                cimt_mm: String(0.8 + index * 0.001),
                ldl_cholesterol: String(100 + index),
                patient_id: `P${index}`,
                smoker: index % 2 === 0 ? "Yes" : "No",
            })),
        );
        const columns: readonly ColumnInference[] = [
            col({
                name: "patient_id",
                primaryType: "categorical",
                semanticTag: "patient-id",
                uniqueCount: 120,
            }),
            col({ name: "smoker", primaryType: "binary", uniqueCount: 2 }),
            col({ name: "ldl_cholesterol", uniqueCount: 112 }),
            col({ name: "cimt_mm", uniqueCount: 95 }),
        ];
        const result = detectLongitudinal(
            rows,
            columns,
            "ldl_cholesterol",
            "cimt_mm",
            "smoker",
        );
        expect(result.isLongitudinal).toBe(false);
    });

    it("rejects sex + systolic_bp false positive on cross-sectional cohort", () => {
        const rows = brandRows(
            Array.from({ length: 120 }, (_, index) => ({
                cimt_mm: String(0.8 + index * 0.001),
                sex: index % 2 === 0 ? "M" : "F",
                smoker: "Yes",
                systolic_bp: String(100 + (index % 55)),
            })),
        );
        const columns: readonly ColumnInference[] = [
            col({ name: "sex", primaryType: "categorical", uniqueCount: 2 }),
            col({ name: "smoker", primaryType: "binary", uniqueCount: 1 }),
            col({ name: "systolic_bp", uniqueCount: 55 }),
            col({ name: "cimt_mm", uniqueCount: 95 }),
        ];
        const result = detectLongitudinal(rows, columns, "systolic_bp", "cimt_mm", "smoker");
        expect(result.isLongitudinal).toBe(false);
    });

    it("exports MAX_X_UNIQUE_VALUES at 10", () => {
        expect(MAX_X_UNIQUE_VALUES).toBe(10);
    });
});
