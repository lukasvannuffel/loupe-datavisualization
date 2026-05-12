import { describe, expect, it } from "vitest";

import { createDefaultChartSpec } from "../factory";
import { chartSpecSchema } from "../schemas";
import type { SpecKind } from "../types";

const ALL_KINDS: readonly SpecKind[] = ["km", "barError", "roc", "forest"];

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
        const a = createDefaultChartSpec("roc");
        const b = createDefaultChartSpec("roc");
        expect(a.id).not.toBe("");
        expect(a.id).not.toBe(b.id);
    });

    it("sets sensible kind-specific defaults", () => {
        const km = createDefaultChartSpec("km");
        const bar = createDefaultChartSpec("barError");
        const roc = createDefaultChartSpec("roc");
        const forest = createDefaultChartSpec("forest");

        if (km.kind === "km") {
            expect(km.timeUnit).toBe("months");
            expect(km.showAtRisk).toBe(true);
        }
        if (bar.kind === "barError") {
            expect(bar.errorBarType).toBe("ci95");
            expect(bar.annotations).toEqual([]);
        }
        if (roc.kind === "roc") {
            expect(roc.showAuc).toBe(true);
            expect(roc.showDiagonalRef).toBe(true);
        }
        if (forest.kind === "forest") {
            expect(forest.nullValue).toBe(1);
            expect(forest.showPooled).toBe(true);
        }
    });
});
