import { describe, expect, it } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import { resolvePalette } from "@/lib/chartSpec/resolvePalette";

describe("resolvePalette", () => {
    it("falls back to monochrome when customizations.palette is unset", () => {
        const spec = createDefaultChartSpec("barError");
        expect(resolvePalette(spec)).toBe("monochrome");
    });

    it("returns customizations.palette when set", () => {
        const spec = {
            ...createDefaultChartSpec("barError"),
            customizations: { palette: "okabe-ito" as const },
        };
        expect(resolvePalette(spec)).toBe("okabe-ito");
    });
});
