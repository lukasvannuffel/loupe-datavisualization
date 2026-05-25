import type { ChartSpec, PaletteName } from "./types";

/** Effective palette for rendering; defaults to monochrome when unset. */
export const resolvePalette = (spec: ChartSpec): PaletteName =>
    spec.customizations?.palette ?? "monochrome";
