import type { PaletteName } from "@/lib/chartSpec/types";
import { resolvePalette } from "@/lib/chartSpec/resolvePalette";

import "./palettes.module.css";

export type { PaletteName };
export { resolvePalette };

/** Swatch preview hex — must match `palettes.module.css` indices 0 and 1. */
export const PALETTE_SWATCH_HEX: Record<PaletteName, readonly [string, string]> = {
    editorial: ["#0e0e0e", "#7a7a7a"],
    "okabe-ito": ["#0072b2", "#e69f00"],
    wong: ["#e69f00", "#56b4e9"],
    "ibm-design": ["#648fff", "#785ef0"],
    "tol-vibrant": ["#ee7733", "#0077bb"],
    "deuteranopia-tuned": ["#005f73", "#ee9b00"],
    monochrome: ["#000000", "#404040"],
};

const EDITORIAL_INK = "var(--ink)";
const EDITORIAL_GRAY = "var(--palette-editorial-gray)";

const PALETTE_COLORS: Record<Exclude<PaletteName, "editorial">, readonly string[]> = {
    "deuteranopia-tuned": [
        "var(--palette-deuteranopia-0)",
        "var(--palette-deuteranopia-1)",
        "var(--palette-deuteranopia-2)",
        "var(--palette-deuteranopia-3)",
    ],
    "ibm-design": [
        "var(--palette-ibm-design-0)",
        "var(--palette-ibm-design-1)",
        "var(--palette-ibm-design-2)",
        "var(--palette-ibm-design-3)",
    ],
    monochrome: [
        "var(--palette-monochrome-0)",
        "var(--palette-monochrome-1)",
        "var(--palette-monochrome-2)",
        "var(--palette-monochrome-3)",
    ],
    "okabe-ito": [
        "var(--palette-okabe-ito-0)",
        "var(--palette-okabe-ito-1)",
        "var(--palette-okabe-ito-2)",
        "var(--palette-okabe-ito-3)",
    ],
    "tol-vibrant": [
        "var(--palette-tol-vibrant-0)",
        "var(--palette-tol-vibrant-1)",
        "var(--palette-tol-vibrant-2)",
        "var(--palette-tol-vibrant-3)",
    ],
    wong: [
        "var(--palette-wong-0)",
        "var(--palette-wong-1)",
        "var(--palette-wong-2)",
        "var(--palette-wong-3)",
    ],
};

export const colorByIndex = (
    palette: PaletteName | undefined,
    index: 0 | 1 | 2 | 3,
    groupCount: number,
): string => {
    const resolved = palette ?? "monochrome";

    if (resolved === "editorial") {
        if (groupCount === 2) {
            return index === 0 ? EDITORIAL_INK : EDITORIAL_GRAY;
        }

        return EDITORIAL_INK;
    }

    return PALETTE_COLORS[resolved][index] ?? PALETTE_COLORS[resolved][0];
};
