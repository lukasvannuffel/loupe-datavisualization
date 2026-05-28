import { describe, expect, it } from "vitest";

import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";

import { assertNoRawRows, FORBIDDEN_KEY_PATTERN } from "../assertNoRawRows";

const kmSpec: ChartSpec = {
    kind: "km",
    version: 1,
    id: "km-id",
    createdAt: "2026-05-27T12:00:00.000Z",
    title: "KM",
    showLegend: true,
    showGrid: false,
    paletteId: "editorial",
    strokeWeight: 1.5,
    legendA: "Arm A",
    dashB: false,
    showAtRisk: true,
    showStats: true,
    timeUnit: "months",
};

const validKmPlotData: PlotData = {
    kind: "km",
    tMax: 24,
    groups: [
        {
            label: "Arm A",
            nTotal: 100,
            nEvents: 30,
            points: [
                { t: 1, survival: 0.95, nAtRisk: 100, censored: false, ciLower: 0.9, ciUpper: 1 },
                { t: 2, survival: 0.9, nAtRisk: 95, censored: true, ciLower: 0.85, ciUpper: 0.96 },
            ],
            atRiskTicks: [{ t: 0, nAtRisk: 100 }, { t: 12, nAtRisk: 60 }],
        },
    ],
};

const xySpec: ChartSpec = {
    kind: "xy",
    version: 1,
    id: "xy-id",
    createdAt: "2026-05-27T12:00:00.000Z",
    title: "XY",
    showLegend: true,
    showGrid: false,
    paletteId: "editorial",
    strokeWeight: 1.5,
    mode: "line",
    showRegression: true,
    showErrorBands: false,
};

describe("assertNoRawRows", () => {
    it("accepts valid KM plot data", () => {
        expect(() => assertNoRawRows(kmSpec, validKmPlotData)).not.toThrow();
    });

    it("accepts KM confidence bounds with NaN at edge points", () => {
        const withNaNCI: PlotData = {
            ...validKmPlotData,
            groups: [
                {
                    ...validKmPlotData.groups[0],
                    points: [
                        ...validKmPlotData.groups[0].points.slice(0, 1),
                        {
                            ...validKmPlotData.groups[0].points[1],
                            ciLower: Number.NaN,
                            ciUpper: Number.NaN,
                        },
                    ],
                },
            ],
        };

        expect(() => assertNoRawRows(kmSpec, withNaNCI)).not.toThrow();
    });

    it("rejects KM plot data containing a patient_id field", () => {
        const injected = {
            ...validKmPlotData,
            groups: [{ ...validKmPlotData.groups[0], patient_id: "P001" }],
        } as unknown as PlotData;

        expect(() => assertNoRawRows(kmSpec, injected)).toThrow(/patient_id/i);
    });

    it("rejects plot data containing row-like injected arrays", () => {
        const injected = {
            ...validKmPlotData,
            rawRows: [{ id: 1, time: 5, event: 1 }],
        } as unknown as PlotData;

        expect(() => assertNoRawRows(kmSpec, injected)).toThrow(/unexpected keys|rawRows|row/i);
    });

    it("rejects plot data with mismatched kind", () => {
        const mismatched = { ...validKmPlotData, kind: "xy" } as unknown as PlotData;

        expect(() => assertNoRawRows(kmSpec, mismatched)).toThrow(/kind mismatch/i);
    });

    it("rejects KM group with unexpected extra field", () => {
        const injected = {
            ...validKmPlotData,
            groups: [{ ...validKmPlotData.groups[0], internalDebugInfo: "oops" }],
        } as unknown as PlotData;

        expect(() => assertNoRawRows(kmSpec, injected)).toThrow(/unexpected keys/i);
    });

    it("accepts longitudinal plot data when chart_spec.kind is xy", () => {
        const longitudinalData = {
            kind: "longitudinal",
            xMin: 0,
            xMax: 12,
            yMin: 7.5,
            yMax: 9.1,
            groups: [
                {
                    label: "A",
                    points: [{ visit: 0, mean: 8, sem: 0.3, n: 60 }],
                },
            ],
        } as PlotData;

        expect(() => assertNoRawRows(xySpec, longitudinalData)).not.toThrow();
    });

    it("rejects longitudinal plot data with unexpected extra field", () => {
        const longitudinalData = {
            kind: "longitudinal",
            xMin: 0,
            xMax: 12,
            yMin: 7.5,
            yMax: 9.1,
            groups: [
                {
                    label: "A",
                    points: [{ visit: 0, mean: 8, sem: 0.3, n: 60 }],
                    rawPatientTrajectories: [{ patient_id: "P001" }],
                },
            ],
        } as unknown as PlotData;

        expect(() => assertNoRawRows(xySpec, longitudinalData)).toThrow();
    });

    it("rejects mismatched: longitudinal plot data when chart_spec.kind is barError", () => {
        const barSpec = {
            kind: "barError",
            version: 1,
            id: "bar-id",
            createdAt: "2026-05-27T12:00:00.000Z",
            title: "Bar",
            showLegend: true,
            showGrid: false,
            paletteId: "editorial",
            strokeWeight: 1.5,
            errorBarType: "ci95",
            annotations: [],
        } as ChartSpec;
        const longitudinalData = {
            kind: "longitudinal",
            xMin: 0,
            xMax: 12,
            yMin: 7.5,
            yMax: 9.1,
            groups: [{ label: "A", points: [{ visit: 0, mean: 8, sem: 0.3, n: 60 }] }],
        } as PlotData;

        expect(() => assertNoRawRows(barSpec, longitudinalData)).toThrow(/kind mismatch/i);
    });

    it.each(["patient_id", "subjectId", "record_id", "foo_id", "identifier"])(
        "flags forbidden key %s",
        (key) => {
            expect(FORBIDDEN_KEY_PATTERN.test(key)).toBe(true);
        },
    );

    it.each(["seriesId", "groupId", "panelId", "label", "mean"])(
        "allows safe key %s",
        (key) => {
            expect(FORBIDDEN_KEY_PATTERN.test(key)).toBe(false);
        },
    );

    describe("allowlist perimeter catches keys the regex no longer matches", () => {
        it.each(["userId", "patientName", "subjectName", "mrn", "dob"])(
            "rejects unexpected key %s injected into a KM group via allowlist",
            (key) => {
                const injected = {
                    ...validKmPlotData,
                    groups: [{ ...validKmPlotData.groups[0], [key]: "leak" }],
                } as unknown as PlotData;

                expect(() => assertNoRawRows(kmSpec, injected)).toThrow(/unexpected keys/i);
            },
        );

        it("confirms userId and patientName are not caught by the regex", () => {
            expect(FORBIDDEN_KEY_PATTERN.test("userId")).toBe(false);
            expect(FORBIDDEN_KEY_PATTERN.test("patientName")).toBe(false);
        });
    });

    // MUTATION-VERIFY:
    //   In src/lib/privacy/assertNoRawRows.ts, mutate the exact call in assertKMShape:
    //   `assertExactKeys(groupRecord, ["label", "points", "atRiskTicks", "nTotal", "nEvents"], groupPath);`
    //   to
    //   `assertExactKeys(groupRecord, ["label", "points", "atRiskTicks", "nTotal", "nEvents", "userId"], groupPath);`.
    //   Re-run "rejects unexpected key userId injected into a KM group via allowlist".
    //   userId is no longer rejected -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/privacy/assertNoRawRows.ts, change FORBIDDEN_KEY_PATTERN
    //   from `/^(patient|subject|record)([_-]?id)?$|_id$|identifier/i` to include `|id$`.
    //   Re-run "allows safe key seriesId".
    //   `seriesId` now matches `id$` -> expect(false) fails -> test RED.
    //   Verified manually: 2026-05-28. REVERTED.
});
