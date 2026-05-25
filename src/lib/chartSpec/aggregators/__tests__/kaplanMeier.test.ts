import { describe, expect, it, vi } from "vitest";

import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { aggregateKaplanMeier } from "../kaplanMeier";
import { KaplanMeierError } from "../kaplanMeier.types";
import { nAtRiskAtTime } from "../nAtRiskAtTime";

const mapping: Mapping = { time: "time", event: "event", group: "arm" };

const syntheticRows = brandRows([
    { arm: "A", time: "5", event: "1" },
    { arm: "A", time: "8", event: "1" },
    { arm: "A", time: "10", event: "0" },
    { arm: "A", time: "12", event: "1" },
    { arm: "A", time: "15", event: "0" },
    { arm: "A", time: "18", event: "1" },
    { arm: "A", time: "20", event: "1" },
    { arm: "A", time: "22", event: "0" },
    { arm: "A", time: "25", event: "1" },
    { arm: "A", time: "30", event: "1" },
]);

describe("aggregateKaplanMeier", () => {
    // MUTATION-VERIFY: KM formula → S = S × (1 − d/(n+1)) → t=5 anchor red. REVERTED.
    it("matches hand-computed survival on the n=10 synthetic fixture", () => {
        const data = aggregateKaplanMeier(syntheticRows, mapping);
        const group = data.groups[0];
        expect(group?.label).toBe("A");
        expect(group?.nTotal).toBe(10);
        expect(group?.nEvents).toBe(7);

        // Hand-computed KM curve (n=10, single group).
        // Times:    [5, 8, 10, 12, 15, 18, 20, 22, 25, 30]
        // Events:   [1, 1, 0,  1,  0,  1,  1,  0,  1,  1]
        //
        // t=5  (event): S = 1.0 × (1 − 1/10)  = 0.9      n was 10
        // t=8  (event): S = 0.9 × (1 − 1/9)   = 0.8      n was 9
        // t=10 (cens):  S = 0.8                          n was 8 → 7
        // t=12 (event): S = 0.8 × (1 − 1/7)   = 0.6857   n was 7
        // t=15 (cens):  S = 0.6857                       n was 6 → 5
        // t=18 (event): S = 0.6857 × (1 − 1/5) = 0.5486  n was 5
        // t=20 (event): S = 0.5486 × (1 − 1/4) = 0.4114  n was 4
        // t=22 (cens):  S = 0.4114                       n was 3 → 2
        // t=25 (event): S = 0.4114 × (1 − 1/2) = 0.2057  n was 2
        // t=30 (event): S = 0.2057 × (1 − 1/1) = 0       n was 1
        const expected: readonly { t: number; survival: number; nAtRisk: number; censored: boolean }[] =
            [
                { t: 5, survival: 0.9, nAtRisk: 10, censored: false },
                { t: 8, survival: 0.8, nAtRisk: 9, censored: false },
                { t: 10, survival: 0.8, nAtRisk: 8, censored: true },
                { t: 12, survival: 6 / 7 * 0.8, nAtRisk: 7, censored: false },
                { t: 15, survival: 6 / 7 * 0.8, nAtRisk: 6, censored: true },
                { t: 18, survival: 0.5485714286, nAtRisk: 5, censored: false },
                { t: 20, survival: 0.4114285714, nAtRisk: 4, censored: false },
                { t: 22, survival: 0.4114285714, nAtRisk: 3, censored: true },
                { t: 25, survival: 0.2057142857, nAtRisk: 2, censored: false },
                { t: 30, survival: 0, nAtRisk: 1, censored: false },
            ];

        expect(group?.points).toHaveLength(expected.length);
        for (let i = 0; i < expected.length; i++) {
            const point = group?.points[i];
            const exp = expected[i] as (typeof expected)[number];
            expect(point?.t).toBe(exp.t);
            expect(point?.survival).toBeCloseTo(exp.survival, 3);
            expect(point?.nAtRisk).toBe(exp.nAtRisk);
            expect(point?.censored).toBe(exp.censored);
        }
    });

    it("correctly computes patients at risk at non-tick event times", () => {
        // At t=12: 10 initial − 1 event (t=5) − 1 event (t=8) − 1 censored (t=10) = 7.
        const data = aggregateKaplanMeier(syntheticRows, mapping);
        const point = data.groups[0]?.points.find((p) => p.t === 12);
        expect(point?.nAtRisk).toBe(7);
        expect(nAtRiskAtTime(data.groups[0] as NonNullable<(typeof data.groups)[0]>, 12)).toBe(7);
    });

    // MUTATION-VERIFY: Array.from(buckets) → [...buckets.entries()].sort(localeCompare) → insertion-order test red. REVERTED.
    it("preserves CSV insertion order for group labels", () => {
        const rows = brandRows([
            { arm: "Placebo", time: "5", event: "1" },
            { arm: "High Dose", time: "6", event: "1" },
            { arm: "Low Dose", time: "7", event: "0" },
            { arm: "Medium Dose", time: "8", event: "1" },
        ]);
        const labels = aggregateKaplanMeier(rows, mapping).groups.map((g) => g.label);
        expect(labels).toEqual(["Placebo", "High Dose", "Low Dose", "Medium Dose"]);
    });

    it("keeps S=1 for all-censored cohort with collapsed CI", () => {
        const rows = brandRows(
            Array.from({ length: 5 }, (_, i) => ({
                arm: "A",
                time: String(10 + i),
                event: "0",
            })),
        );
        const group = aggregateKaplanMeier(rows, mapping).groups[0];
        expect(group?.nEvents).toBe(0);
        for (const point of group?.points ?? []) {
            expect(point.survival).toBe(1);
            expect(point.ciLower).toBe(1);
            expect(point.ciUpper).toBe(1);
        }
    });

    it("throws when no valid rows remain", () => {
        expect(() => aggregateKaplanMeier(brandRows([]), mapping)).toThrow(KaplanMeierError);
        expect(() =>
            aggregateKaplanMeier(brandRows([{ arm: "A", time: "x", event: "1" }]), mapping),
        ).toThrow("No valid rows.");
    });

    it("throws when more than 4 groups are present", () => {
        const rows = brandRows(
            ["G1", "G2", "G3", "G4", "G5"].map((arm) => ({
                arm,
                time: "10",
                event: "1",
            })),
        );
        expect(() => aggregateKaplanMeier(rows, mapping)).toThrow(
            "Max 4 groups supported. Received 5.",
        );
    });

    it("handles a single-patient group with one event", () => {
        const rows = brandRows([{ arm: "solo", time: "12", event: "1" }]);
        const group = aggregateKaplanMeier(rows, mapping).groups[0];
        expect(group?.points.at(-1)?.survival).toBe(0);
        expect(group?.nTotal).toBe(1);
    });

    it("aggregates without a group column into All", () => {
        const rows = brandRows([{ time: "5", event: "1" }]);
        const group = aggregateKaplanMeier(rows, { time: "time", event: "event" }).groups[0];
        expect(group?.label).toBe("All");
    });

    it("never calls fetch during aggregation", () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
        aggregateKaplanMeier(syntheticRows, mapping);
        expect(fetchSpy).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});

describe("privacy: KMPlotData contains no per-patient data", () => {
    // MUTATION-VERIFY: KMGroup.times = rows.map(r => r.time) → privacy test red. REVERTED.
    it("serialized output has no time[] or event[] arrays", () => {
        const largeFixture = brandRows(
            Array.from({ length: 50 }, (_, i) => ({
                arm: "A",
                time: String(5 + (i % 10)),
                event: i % 3 === 0 ? "1" : "0",
                patientId: `p${i}`,
            })),
        );
        const data = aggregateKaplanMeier(largeFixture, mapping);
        const json = JSON.stringify(data);
        expect(json).not.toMatch(/"time":\s*\[/);
        expect(json).not.toMatch(/"event":\s*\[/);
        expect(json).not.toMatch(/patientId/i);
    });

    it("output point count is bounded by unique event/censoring times, not input rows", () => {
        const hundredPatientFixture = brandRows(
            Array.from({ length: 100 }, (_, i) => ({
                arm: "A",
                time: String(5 + (i % 10)),
                event: i % 2 === 0 ? "1" : "0",
            })),
        );
        const uniqueTimeCount = 10;
        const data = aggregateKaplanMeier(hundredPatientFixture, mapping);
        for (const g of data.groups) {
            expect(g.points.length).toBeLessThanOrEqual(uniqueTimeCount);
        }
    });
});
