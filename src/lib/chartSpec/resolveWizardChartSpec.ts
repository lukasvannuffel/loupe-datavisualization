import {
    applyXYLongitudinalRouting,
    createDefaultChartSpec,
} from "@/lib/chartSpec/factory";
import { attachCustomizations } from "@/lib/chartSpec/labels/buildCustomizations";
import type { ChartSpec } from "@/lib/chartSpec/types";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { brandRows, type PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

export type WizardChartDataset = {
    readonly inferences: readonly ColumnInference[];
    readonly rows: PrivateRows;
};

export type ResolveWizardChartSpecInput = {
    readonly chartKind: ChartSpec["kind"];
    readonly chartSpec: ChartSpec | null;
    readonly dataset: WizardChartDataset | null;
    readonly mapping: Mapping;
};

export type ResolveWizardChartSpecResult = {
    readonly spec: ChartSpec;
    readonly mapping: Mapping;
};

export const resolveWizardChartSpec = ({
    chartKind,
    chartSpec,
    dataset,
    mapping,
}: ResolveWizardChartSpecInput): ResolveWizardChartSpecResult => {
    const rows = dataset?.rows ?? brandRows([]);
    const baseSpec =
        chartSpec ??
        createDefaultChartSpec(chartKind, undefined, {
            inferences: dataset?.inferences ?? [],
            mapping,
            rows,
        });

    if (chartKind === "xy" && baseSpec.kind === "xy" && dataset !== null) {
        const routed = applyXYLongitudinalRouting(baseSpec, {
            inferences: dataset.inferences,
            mapping,
            rows: dataset.rows,
        });

        return {
            spec: attachCustomizations(routed.spec, routed.mapping),
            mapping: routed.mapping,
        };
    }

    return {
        spec: attachCustomizations(baseSpec, mapping),
        mapping,
    };
};
