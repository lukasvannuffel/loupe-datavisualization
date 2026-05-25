import type { ChartSpec, PaletteName } from "../types";

export type SpecUpdater = (prev: ChartSpec) => ChartSpec;

export const updateCustomizationTitle = (spec: ChartSpec, title: string): ChartSpec => ({
    ...spec,
    title,
    customizations: {
        ...spec.customizations,
        title,
    },
});

export const updateAxisLabel = (
    spec: ChartSpec,
    axis: "x" | "y",
    label: string,
): ChartSpec => ({
    ...spec,
    ...(axis === "x" ? { xLabel: label } : { yLabel: label }),
    customizations: {
        ...spec.customizations,
        axes: {
            ...spec.customizations?.axes,
            [axis]: {
                ...spec.customizations?.axes?.[axis],
                label,
            },
        },
    },
});

export const updateCustomizationPalette = (
    spec: ChartSpec,
    palette: PaletteName,
): ChartSpec => ({
    ...spec,
    customizations: {
        ...spec.customizations,
        palette,
    },
});

export const patchSpecKind = <K extends ChartSpec["kind"]>(
    spec: ChartSpec & { kind: K },
    patch: Partial<Extract<ChartSpec, { kind: K }>>,
): ChartSpec => ({
    ...spec,
    ...patch,
});
