import { describe, expect, it } from "vitest";

import { deriveTitle } from "../deriveTitle";

describe("deriveTitle", () => {
    it("barError: y by x", () => {
        expect(
            deriveTitle({
                chartKind: "barError",
                xLabel: "Treatment group",
                yLabel: "BP reduction (mmHg)",
            }),
        ).toBe("BP reduction (mmHg) by Treatment group");
    });

    it("box: y by x", () => {
        expect(
            deriveTitle({
                chartKind: "box",
                xLabel: "Stage",
                yLabel: "Tumor size (mm)",
            }),
        ).toBe("Tumor size (mm) by Stage");
    });

    it("km: survival over x", () => {
        expect(
            deriveTitle({
                chartKind: "km",
                xLabel: "Time (months)",
                yLabel: "Survival probability",
            }),
        ).toBe("Survival probability over Time (months)");
    });

    it("KM title updates when Y-axis label is edited via customizations", () => {
        expect(
            deriveTitle({
                chartKind: "km",
                xLabel: "Time (months)",
                yLabel: "OS probability",
            }),
        ).toBe("OS probability over Time (months)");
    });

    it("xy line: y over x", () => {
        expect(
            deriveTitle({
                chartKind: "xy",
                mode: "line",
                xLabel: "Visit month",
                yLabel: "HbA1c (%)",
            }),
        ).toBe("HbA1c (%) over Visit month");
    });

    it("xy scatter: y vs x", () => {
        expect(
            deriveTitle({
                chartKind: "xy",
                mode: "scatter",
                xLabel: "LDL cholesterol",
                yLabel: "CIMT (mm)",
            }),
        ).toBe("CIMT (mm) vs LDL cholesterol");
    });

    it("xy both: y vs x (default branch)", () => {
        expect(
            deriveTitle({
                chartKind: "xy",
                mode: "both",
                xLabel: "X",
                yLabel: "Y",
            }),
        ).toBe("Y vs X");
    });
});
