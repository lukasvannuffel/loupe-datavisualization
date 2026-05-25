import { describe, expect, it } from "vitest";

import type { ColumnInference } from "@/lib/parser/inference.types";
import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { deriveLabel } from "../labels/deriveLabel";
import { applyXYLongitudinalRouting, createDefaultChartSpec, createRoutedChartSpec } from "../factory";
import { chartSpecSchema } from "../schemas";
import type { SpecKind, XYSpec } from "../types";

const ALL_KINDS: readonly SpecKind[] = ["km", "barError", "box", "xy"];

describe("createDefaultChartSpec", () => {
    it.each(ALL_KINDS)(
        "produces a schema-valid default spec for kind=%s",
        (kind) => {
            const spec = createDefaultChartSpec(kind);
            const parsed = chartSpecSchema.safeParse(spec);
            expect(parsed.success).toBe(true);
            expect(spec.kind).toBe(kind);
        },
    );

    it("honours the seed for deterministic output (id + createdAt)", () => {
        const spec = createDefaultChartSpec("km", {
            id: "fixed-id",
            createdAt: "2026-05-12T10:00:00.000Z",
        });
        expect(spec.id).toBe("fixed-id");
        expect(spec.createdAt).toBe("2026-05-12T10:00:00.000Z");
    });

    it("generates a non-empty unique id when unseeded", () => {
        const a = createDefaultChartSpec("xy");
        const b = createDefaultChartSpec("xy");
        expect(a.id).not.toBe("");
        expect(a.id).not.toBe(b.id);
    });

    it("populates customizations from column mapping via deriveLabel", () => {
        const mapping: Mapping = {
            group: "treatment_group",
            outcome: "bp_reduction_mmHg",
        };
        const spec = createDefaultChartSpec("barError", undefined, {
            mapping,
            rows: brandRows([]),
            inferences: [],
        });
        expect(spec.customizations?.axes?.x?.label).toBe(deriveLabel("treatment_group"));
        expect(spec.customizations?.axes?.y?.label).toBe(deriveLabel("bp_reduction_mmHg"));
        expect(spec.customizations?.title).toContain(deriveLabel("bp_reduction_mmHg"));
        expect(spec.title).toBe(spec.customizations?.title);
    });

    it("sets sensible kind-specific defaults", () => {
        const km = createDefaultChartSpec("km");
        const bar = createDefaultChartSpec("barError");
        const box = createDefaultChartSpec("box");
        const xy = createDefaultChartSpec("xy");

        if (km.kind === "km") {
            expect(km.timeUnit).toBe("months");
            expect(km.showAtRisk).toBe(true);
        }
        if (bar.kind === "barError") {
            expect(bar.errorBarType).toBe("ci95");
            expect(bar.annotations).toEqual([]);
        }
        if (box.kind === "box") {
            expect(box.showOutliers).toBe(true);
            expect(box.notched).toBe(false);
        }
        if (xy.kind === "xy") {
            expect(xy.mode).toBe("scatter");
            expect(xy.showRegression).toBe(true);
            expect(xy.showErrorBands).toBe(false);
        }
    });

    it("routes repeated-measures data to line mode via applyXYLongitudinalRouting", () => {
        const visits = [0, 3, 6, 9, 12];
        const rows = brandRows(
            Array.from({ length: 270 }, (_, index) => {
                const patient = Math.floor(index / visits.length);
                const visit = visits[index % visits.length]!;
                return {
                    hba1c_percent: "7.5",
                    patient_id: `P${patient}`,
                    treatment_arm: patient % 2 === 0 ? "A" : "B",
                    visit_month: String(visit),
                };
            }),
        );
        const inferences: readonly ColumnInference[] = [
            {
                confidence: 1,
                name: "patient_id",
                nullCount: 0,
                primaryType: "categorical",
                reasons: [],
                sampleValues: [],
                semanticTag: "patient-id",
                uniqueCount: 60,
            },
            {
                confidence: 1,
                name: "treatment_arm",
                nullCount: 0,
                primaryType: "categorical",
                reasons: [],
                sampleValues: [],
                uniqueCount: 2,
            },
            {
                confidence: 1,
                name: "visit_month",
                nullCount: 0,
                primaryType: "integer",
                reasons: [],
                sampleValues: [],
                uniqueCount: 5,
            },
            {
                confidence: 1,
                name: "hba1c_percent",
                nullCount: 0,
                primaryType: "numeric",
                reasons: [],
                sampleValues: [],
                uniqueCount: 40,
            },
        ];
        const mapping: Mapping = {
            group: "treatment_arm",
            x: "visit_month",
            y: "hba1c_percent",
        };
        const base = createDefaultChartSpec("xy", {
            createdAt: "2026-05-20T10:00:00.000Z",
            id: "xy-route",
        });
        if (base.kind !== "xy") {
            throw new Error("expected xy");
        }

        const routed = applyXYLongitudinalRouting(base, { inferences, mapping, rows });
        if (routed.spec.kind !== "xy") {
            throw new Error("expected xy");
        }
        expect(routed.spec.mode).toBe("line");
        expect(routed.spec.showRegression).toBe(true);
        expect(routed.mapping.id).toBe("patient_id");
    });

    it("createRoutedChartSpec returns scatter for non-longitudinal mapping", () => {
        const rows = brandRows(
            Array.from({ length: 120 }, (_, index) => ({
                cimt_mm: String(0.8 + index * 0.001),
                ldl_cholesterol: String(100 + index),
                patient_id: `P${index}`,
                smoker: "Yes",
            })),
        );
        const inferences: readonly ColumnInference[] = [
            {
                confidence: 1,
                name: "patient_id",
                nullCount: 0,
                primaryType: "categorical",
                reasons: [],
                sampleValues: [],
                uniqueCount: 120,
            },
            {
                confidence: 1,
                name: "smoker",
                nullCount: 0,
                primaryType: "binary",
                reasons: [],
                sampleValues: [],
                uniqueCount: 2,
            },
            {
                confidence: 1,
                name: "ldl_cholesterol",
                nullCount: 0,
                primaryType: "numeric",
                reasons: [],
                sampleValues: [],
                uniqueCount: 120,
            },
            {
                confidence: 1,
                name: "cimt_mm",
                nullCount: 0,
                primaryType: "numeric",
                reasons: [],
                sampleValues: [],
                uniqueCount: 120,
            },
        ];
        const mapping: Mapping = {
            group: "smoker",
            x: "ldl_cholesterol",
            y: "cimt_mm",
        };
        const routed = createRoutedChartSpec("xy", { inferences, mapping, rows });
        const spec = routed.spec as XYSpec;
        expect(spec.mode).toBe("scatter");
        expect(spec.showRegression).toBe(true);
    });
});
