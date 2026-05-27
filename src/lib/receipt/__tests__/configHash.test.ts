import { describe, expect, it } from "vitest";

import type { ChartSpec } from "@/lib/chartSpec/types";

import { computeConfigHash } from "../configHash";

const baseKmSpec = (): ChartSpec => ({
    kind: "km",
    version: 1,
    id: "spec-km",
    createdAt: "2026-05-27T12:00:00.000Z",
    title: "KM",
    showLegend: true,
    showGrid: false,
    paletteId: "editorial",
    strokeWeight: 1.5,
    legendA: "A",
    dashB: false,
    showAtRisk: true,
    showStats: true,
    timeUnit: "months",
});

describe("computeConfigHash", () => {
    it("same chart_spec produces same hash regardless of key order", async () => {
        const a: ChartSpec = {
            ...baseKmSpec(),
            customizations: { axes: { x: { label: "Days" }, y: { label: "Survival" } } },
        };
        const b: ChartSpec = {
            ...baseKmSpec(),
            customizations: { axes: { y: { label: "Survival" }, x: { label: "Days" } } },
        };

        await expect(computeConfigHash(a)).resolves.toBe(await computeConfigHash(b));
    });

    it("different chart_specs produce different hashes", async () => {
        const a = baseKmSpec();
        const b = { ...baseKmSpec(), title: "Different title" } satisfies ChartSpec;

        expect(await computeConfigHash(a)).not.toBe(await computeConfigHash(b));
    });

    it("produces the display format sha256·XXXXXX…YYYY", async () => {
        const hash = await computeConfigHash(baseKmSpec());

        expect(hash).toMatch(/^sha256·[a-f0-9]{6}…[a-f0-9]{4}$/);
    });

    // MUTATION-VERIFY:
    //   In src/lib/receipt/configHash.ts, change canonicalize() to skip key sorting
    //   (replace Object.keys(record).sort() with Object.keys(record)).
    //   Re-run "same chart_spec produces same hash regardless of key order".
    //   Reordered keys now produce different hashes -> test RED.
    //   Verified manually: 2026-05-27. REVERTED.
});
