import { describe, expect, it } from "vitest";

import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { chi2pValue } from "../chi2pValue";
import { computeKmLogRank } from "../kmLogRank";

const mapping: Mapping = { time: "time", event: "event", group: "arm" };

const twoGroupRows = brandRows([
    { arm: "A", time: "5", event: "1" },
    { arm: "A", time: "8", event: "1" },
    { arm: "A", time: "10", event: "0" },
    { arm: "A", time: "12", event: "1" },
    { arm: "A", time: "15", event: "0" },
    { arm: "B", time: "18", event: "1" },
    { arm: "B", time: "20", event: "1" },
    { arm: "B", time: "22", event: "0" },
    { arm: "B", time: "25", event: "1" },
    { arm: "B", time: "30", event: "1" },
]);

const threeGroupRows = brandRows([
    { arm: "A", time: "5", event: "1" },
    { arm: "A", time: "8", event: "1" },
    { arm: "A", time: "10", event: "0" },
    { arm: "A", time: "12", event: "1" },
    { arm: "A", time: "15", event: "0" },
    { arm: "B", time: "18", event: "1" },
    { arm: "B", time: "20", event: "1" },
    { arm: "B", time: "22", event: "0" },
    { arm: "B", time: "25", event: "1" },
    { arm: "B", time: "30", event: "1" },
    { arm: "C", time: "6", event: "1" },
    { arm: "C", time: "9", event: "0" },
    { arm: "C", time: "11", event: "1" },
    { arm: "C", time: "14", event: "0" },
    { arm: "C", time: "16", event: "1" },
]);

describe("chi2pValue", () => {
    // R: 1 - pchisq(3.841, 1)
    it("anchors df=1 chi2=3.841 at p≈0.050", () => {
        expect(chi2pValue(3.841, 1)).toBeCloseTo(0.05, 2);
    });

    // R: 1 - pchisq(10.827, 1)
    it("anchors df=1 chi2=10.827 at p≈0.001", () => {
        expect(chi2pValue(10.827, 1)).toBeCloseTo(0.001, 3);
    });
});

describe("computeKmLogRank", () => {
    // R: library(survival); df <- data.frame(time=c(5,8,10,12,15,18,20,22,25,30),
    //     event=c(1,1,0,1,0,1,1,0,1,1), group=c("A","A","A","A","A","B","B","B","B","B"))
    // survdiff(Surv(time, event) ~ group, data=df) → Chisq=4.468, p=0.0345
    it("matches R survdiff on 2-group synthetic fixture", () => {
        const result = computeKmLogRank(twoGroupRows, mapping);

        expect(result).not.toBeNull();
        expect(result?.chi2).toBeCloseTo(4.4684158505, 4);
        expect(result?.df).toBe(1);
        expect(result?.pValue).toBeCloseTo(0.0345269891, 4);
    });

    // R: library(survival); survdiff(Surv(time, event) ~ group, data=df3)
    // df3 adds group C rows → Chisq=6.860, df=2, p=0.0324
    it("matches R survdiff on 3-group fixture, df=2", () => {
        const result = computeKmLogRank(threeGroupRows, mapping);

        expect(result).not.toBeNull();
        expect(result?.chi2).toBeCloseTo(6.8599631771, 4);
        expect(result?.df).toBe(2);
        expect(result?.pValue).toBeCloseTo(0.0323875371, 4);
    });

    it("returns null for single group", () => {
        const rows = brandRows([
            { arm: "A", time: "5", event: "1" },
            { arm: "A", time: "8", event: "1" },
            { arm: "A", time: "10", event: "0" },
        ]);

        expect(computeKmLogRank(rows, mapping)).toBeNull();
    });

    it("returns null when a group has fewer than 2 events", () => {
        const rows = brandRows([
            { arm: "A", time: "5", event: "1" },
            { arm: "A", time: "8", event: "0" },
            { arm: "B", time: "10", event: "1" },
            { arm: "B", time: "12", event: "1" },
        ]);

        expect(computeKmLogRank(rows, mapping)).toBeNull();
    });

    // MUTATION-VERIFY: kmLogRank.ts:69 — change `u += d0 - (n0 * d) / n` to `u += d0 + (n0 * d) / n`.
    // Test: "matches R survdiff on 2-group synthetic fixture" must red. Verified manually: 2026-06-09. REVERTED.
});
