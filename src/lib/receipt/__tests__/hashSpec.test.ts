import { describe, expect, it } from "vitest";

import type { ChartSpec } from "@/lib/chartSpec/types";

import type { ComputationSummary } from "../composeReceipt";
import { hashSpecAndComputations } from "../hashSpec";

const kmSpec: ChartSpec = {
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
};

const baseComputations: ComputationSummary = {
    chartType: "km",
    kmCensoredN: 42,
    kmTotalN: 610,
    kmGroupCount: 2,
    kmStepCount: 120,
    dataColumns: ["arm", "days", "status"],
    computedAt: "2026-05-27T12:00:00.000Z",
};

describe("hashSpecAndComputations", () => {
    it("produces a 64-character hex string", async () => {
        const hash = await hashSpecAndComputations(kmSpec, baseComputations);

        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("is deterministic — same input produces same hash", async () => {
        const first = await hashSpecAndComputations(kmSpec, baseComputations);
        const second = await hashSpecAndComputations(kmSpec, baseComputations);

        expect(first).toBe(second);
    });

    it("is sensitive to ChartSpec changes", async () => {
        const baseline = await hashSpecAndComputations(kmSpec, baseComputations);
        const changed = await hashSpecAndComputations({ ...kmSpec, title: "Different" }, baseComputations);

        expect(changed).not.toBe(baseline);
    });

    it("is sensitive to computation changes", async () => {
        const baseline = await hashSpecAndComputations(kmSpec, baseComputations);
        const changed = await hashSpecAndComputations(kmSpec, { ...baseComputations, kmCensoredN: 99 });

        expect(changed).not.toBe(baseline);
    });

    it("key order does not affect hash", async () => {
        const specReordered = Object.fromEntries(
            Object.entries(kmSpec).reverse(),
        ) as ChartSpec;

        const hashA = await hashSpecAndComputations(kmSpec, baseComputations);
        const hashB = await hashSpecAndComputations(specReordered, baseComputations);

        expect(hashA).toBe(hashB);
    });

    // MUTATION-VERIFY: hashSpec.ts line 24 — replace `JSON.stringify(payload, sortedReplacer)` with `JSON.stringify(payload)`.
    // Test: "key order does not affect hash". Verified manually: 2026-05-30. REVERTED.
});
