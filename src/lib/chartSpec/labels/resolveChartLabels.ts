import type { ChartSpec } from "../types";

export type ResolvedChartLabels = {
    readonly title: string;
    readonly xLabel: string;
    readonly yLabel: string;
};

/** Resolved labels for render: customizations override legacy base fields (LOUPE-15a). */
export const resolveChartLabels = (spec: ChartSpec): ResolvedChartLabels => ({
    title: spec.customizations?.title ?? spec.title,
    xLabel: spec.customizations?.axes?.x?.label ?? spec.xLabel ?? "",
    yLabel: spec.customizations?.axes?.y?.label ?? spec.yLabel ?? "",
});
