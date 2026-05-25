import { describe, expect, it } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";

import { colorByIndex, resolvePalette } from "../palettes";

describe("colorByIndex", () => {
    it("defaults to editorial palette when palette is unset", () => {
        expect(colorByIndex(undefined, 0, 2)).toBe("var(--ink)");
        expect(colorByIndex(undefined, 1, 2)).toBe("var(--palette-editorial-gray)");
    });

    it("editorial 2-group uses ink and gray", () => {
        expect(colorByIndex("editorial", 0, 2)).toBe("var(--ink)");
        expect(colorByIndex("editorial", 1, 2)).toBe("var(--palette-editorial-gray)");
    });

    it("editorial with more than 2 groups uses all ink", () => {
        expect(colorByIndex("editorial", 0, 4)).toBe("var(--ink)");
        expect(colorByIndex("editorial", 1, 4)).toBe("var(--ink)");
        expect(colorByIndex("editorial", 2, 4)).toBe("var(--ink)");
    });

    it("okabe-ito palette gives distinct colors per group index", () => {
        const g0 = colorByIndex("okabe-ito", 0, 2);
        const g1 = colorByIndex("okabe-ito", 1, 2);

        expect(g0).not.toBe(g1);
        expect(g0).toBe("var(--palette-okabe-ito-0)");
        expect(g1).toBe("var(--palette-okabe-ito-1)");
    });

    // MUTATION-VERIFY:
    //   In palettes.ts, set PALETTE_COLORS['okabe-ito'][1] to PALETTE_COLORS['okabe-ito'][0].
    //   Test: "okabe-ito palette gives distinct colors per group index".
    //   expect(g0).not.toBe(g1) fails → RED.
    //   Verified manually: 2026-05-25. REVERTED.
});

describe("resolvePalette", () => {
    it("returns editorial when customizations.palette is unset", () => {
        const spec = createDefaultChartSpec("barError");
        expect(resolvePalette(spec)).toBe("editorial");
    });

    it("returns stored palette from customizations", () => {
        const spec = {
            ...createDefaultChartSpec("xy"),
            customizations: { palette: "wong" as const },
        };
        expect(resolvePalette(spec)).toBe("wong");
    });
});
