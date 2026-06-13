import type { UserPalette } from "@/app/palettes/schemas";
import { isUuidPaletteId } from "@/app/palettes/schemas";

import type { ChartSpec, PaletteId, PaletteName } from "./types";

const BUILTIN_PALETTE_NAMES = new Set<PaletteName>([
    "editorial",
    "okabe-ito",
    "wong",
    "ibm-design",
    "tol-vibrant",
    "deuteranopia-tuned",
    "monochrome",
]);

export const isBuiltinPaletteName = (value: string): value is PaletteName =>
    BUILTIN_PALETTE_NAMES.has(value as PaletteName);

/** Stored palette id from spec — no rendering fallback. */
export const storedPaletteId = (spec: ChartSpec): PaletteId =>
    spec.customizations?.palette ?? "monochrome";

/** Effective palette for rendering; unknown user UUIDs fall back to editorial. */
export const resolvePalette = (
    spec: ChartSpec,
    userPalettes?: readonly UserPalette[],
): PaletteId => {
    const stored = storedPaletteId(spec);

    if (userPalettes === undefined || !isUuidPaletteId(stored)) {
        return stored;
    }

    const found = userPalettes.some((palette) => palette.id === stored);
    if (!found) {
        return "editorial";
    }

    return stored;
};
