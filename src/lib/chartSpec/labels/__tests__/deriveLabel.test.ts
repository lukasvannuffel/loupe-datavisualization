import { describe, expect, it } from "vitest";

import { deriveLabel } from "../deriveLabel";

// All anchors hand-derived from LOUPE-15a derivation rules.
const ANCHORS: ReadonlyArray<readonly [string, string]> = [
    ["age", "Age"],
    ["weight", "Weight"],
    ["treatment_group", "Treatment group"],
    ["visit_month", "Visit month"],
    ["bp_reduction", "BP reduction"],
    ["ldl_cholesterol", "LDL cholesterol"],
    ["hba1c_baseline", "HbA1c baseline"],
    ["cimt_mm", "CIMT (mm)"],
    ["bp_reduction_mmHg", "BP reduction (mmHg)"],
    ["weight_kg", "Weight (kg)"],
    ["glucose_mg", "Glucose (mg/dL)"],
    ["time_months", "Time (months)"],
    ["response_percent", "Response (%)"],
    ["response_pct", "Response (%)"],
    ["systolic_blood_pressure_mmHg", "Systolic blood pressure (mmHg)"],
    ["hba1cPercent", "HbA1c (%)"],
    ["kg", "Kg"],
    ["", ""],
];

describe("deriveLabel", () => {
    it.each(ANCHORS)("deriveLabel(%j) → %j", (input, expected) => {
        expect(deriveLabel(input)).toBe(expected);
    });

    it("preserves LDL as abbreviation in ldl_cholesterol", () => {
        expect(deriveLabel("ldl_cholesterol")).toBe("LDL cholesterol");
    });

    // MUTATION-VERIFY:
    //   In deriveLabel.ts, remove the abbreviation check (the
    //   `MEDICAL_ABBREVIATIONS.has(lower)` branch in formatToken).
    //   Re-run "preserves LDL as abbreviation in ldl_cholesterol".
    //   Expected "LDL cholesterol" becomes "Ldl cholesterol" → test RED.
    //   Verified manually: 2026-05-25. REVERTED.
});
