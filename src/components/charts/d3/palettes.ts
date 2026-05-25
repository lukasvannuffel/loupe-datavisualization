import type { ChartSpec, PaletteName } from "@/lib/chartSpec/types";

import "./palettes.module.css";

export type { PaletteName };

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

export const resolvePalette = (spec: ChartSpec): PaletteName =>
    spec.customizations?.palette ?? "editorial";

export const colorByIndex = (
    palette: PaletteName | undefined,
    index: 0 | 1 | 2 | 3,
    groupCount: number,
): string => {
    const resolved = palette ?? "editorial";

    if (resolved === "editorial") {
        if (groupCount === 2) {
            return index === 0 ? EDITORIAL_INK : EDITORIAL_GRAY;
        }

        return EDITORIAL_INK;
    }

    return PALETTE_COLORS[resolved][index] ?? PALETTE_COLORS[resolved][0];
};
