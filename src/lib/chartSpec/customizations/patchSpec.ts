import type { ChartSpec, PaletteName } from "../types";

export type SpecUpdater = (prev: ChartSpec) => ChartSpec;

export const updateCustomizationTitle = (spec: ChartSpec, title: string): ChartSpec => {
    const trimmed = title.trim();

    if (trimmed.length === 0) {
        if (spec.customizations?.title === undefined) {
            return spec;
        }

        const customRest = { ...spec.customizations };
        delete customRest.title;
        const hasCustomizations = Object.keys(customRest).length > 0;

        return {
            ...spec,
            customizations: hasCustomizations ? customRest : undefined,
        };
    }

    return {
        ...spec,
        title: trimmed,
        customizations: {
            ...spec.customizations,
            title: trimmed,
        },
    };
};

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
