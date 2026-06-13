import { describe, expect, it } from "vitest";

import { createDefaultChartSpec } from "@/lib/chartSpec";
import { resolvePalette, storedPaletteId } from "@/lib/chartSpec/resolvePalette";

describe("resolvePalette", () => {
    it("falls back to monochrome when customizations.palette is unset", () => {
        const spec = createDefaultChartSpec("barError");
        expect(resolvePalette(spec)).toBe("monochrome");
        expect(storedPaletteId(spec)).toBe("monochrome");
    });

    it("returns customizations.palette when set", () => {
        const spec = {
            ...createDefaultChartSpec("barError"),
            customizations: { palette: "okabe-ito" as const },
        };
        expect(resolvePalette(spec)).toBe("okabe-ito");
        expect(storedPaletteId(spec)).toBe("okabe-ito");
    });

    it("returns unknown UUID when userPalettes is not provided", () => {
        const spec = {
            ...createDefaultChartSpec("barError"),
            customizations: {
                palette: "00000000-0000-0000-0000-000000000001",
            },
        };

        expect(resolvePalette(spec)).toBe("00000000-0000-0000-0000-000000000001");
    });

    it('falls back to editorial when UUID is missing from userPalettes', () => {
        const spec = {
            ...createDefaultChartSpec("barError"),
            customizations: {
                palette: "00000000-0000-0000-0000-000000000001",
            },
        };

        expect(
            resolvePalette(spec, [
                {
                    id: "00000000-0000-0000-0000-000000000099",
                    name: "Other",
                    colors: ["#003D6B"],
                },
            ]),
        ).toBe("editorial");
    });
});
