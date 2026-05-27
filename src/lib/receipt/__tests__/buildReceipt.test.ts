import { describe, expect, it } from "vitest";

import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import { buildReceipt } from "../buildReceipt";
import { receiptSchema } from "../schemas";

const baseInput = {
    aiRationale: "Time-to-event with censoring and two treatment arms.",
    chartSpec: {
        kind: "km",
        version: 1,
        id: "spec-km",
        createdAt: "2026-05-27T12:00:00.000Z",
        title: "Overall survival",
        showLegend: true,
        showGrid: false,
        paletteId: "editorial",
        strokeWeight: 1.5,
        legendA: "A",
        dashB: false,
        showAtRisk: true,
        showStats: true,
        timeUnit: "months",
    } as ChartSpec,
    columnMapping: {
        event: "status",
        group: "arm",
        time: "days",
    } as Mapping,
    generatedAt: "2026-05-27T12:00:00.000Z",
    nRowsInput: 610,
    palette: "editorial" as const,
    plotData: {
        groups: [
            {
                atRiskTicks: [],
                label: "A",
                nEvents: 0,
                nTotal: 312,
                points: [
                    { t: 1, survival: 0.9, nAtRisk: 312, censored: true, ciLower: 0.8, ciUpper: 1 },
                    { t: 2, survival: 0.8, nAtRisk: 300, censored: false, ciLower: 0.7, ciUpper: 0.9 },
                ],
            },
            {
                atRiskTicks: [],
                label: "B",
                nEvents: 0,
                nTotal: 298,
                points: [{ t: 1, survival: 0.95, nAtRisk: 298, censored: true, ciLower: 0.9, ciUpper: 1 }],
            },
        ],
        kind: "km",
        tMax: 24,
    } as PlotData,
};

describe("buildReceipt", () => {
    it("builds a valid receipt that parses through receiptSchema", async () => {
        const receipt = await buildReceipt(baseInput);

        expect(receiptSchema.safeParse(receipt).success).toBe(true);
    });

    it("two builds from the same inputs produce the same config_hash", async () => {
        const a = await buildReceipt(baseInput);
        const b = await buildReceipt(baseInput);

        expect(a.config_hash).toBe(b.config_hash);
    });

    it("builds a different config_hash when chart_spec changes", async () => {
        const a = await buildReceipt(baseInput);
        const b = await buildReceipt({
            ...baseInput,
            chartSpec: { ...baseInput.chartSpec, title: "Different title" },
        });

        expect(a.config_hash).not.toBe(b.config_hash);
    });

    it("does not include patient row data patterns in serialized receipt output", async () => {
        const receipt = await buildReceipt({
            ...baseInput,
            columnMapping: {
                ...baseInput.columnMapping,
                id: "patient_id",
            },
        });
        const serialized = JSON.stringify(receipt);

        expect(serialized).not.toMatch(/pid:|patientId|subjectId|"P\d{3}"/i);
    });
});
