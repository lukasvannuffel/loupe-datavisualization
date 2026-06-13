import { computeKmLogRank } from "@/lib/chartSpec/aggregators/kmLogRank";
import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";
import type { PrivateRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import type { ComputationSummary } from "./composeReceipt";

const ERROR_BAR_LABELS: Record<Extract<ChartSpec, { kind: "barError" }>["errorBarType"], string> = {
    ci95: "95% CI",
    sd: "SD",
    sem: "SEM",
};

const columnNamesFromMapping = (mapping: Mapping): readonly string[] =>
    [...new Set(Object.values(mapping).filter((value): value is string => typeof value === "string"))].sort();

export const summarizeComputations = (
    spec: ChartSpec,
    plotData: PlotData,
    mapping: Mapping,
    computedAt: string = new Date().toISOString(),
    rows?: PrivateRows,
): ComputationSummary => {
    const base = {
        chartType: spec.kind,
        dataColumns: columnNamesFromMapping(mapping),
        computedAt,
    } as const;

    if (spec.kind === "km" && plotData.kind === "km") {
        const kmStepCount = plotData.groups.reduce((sum, group) => sum + group.points.length, 0);
        const kmCensoredN = plotData.groups.reduce(
            (sum, group) => sum + (group.nTotal - group.nEvents),
            0,
        );
        const kmTotalN = plotData.groups.reduce((sum, group) => sum + group.nTotal, 0);
        const logRank =
            plotData.logRank ?? (rows !== undefined ? computeKmLogRank(rows, mapping) : null);

        return {
            ...base,
            kmCensoredN,
            kmGroupCount: plotData.groups.length,
            kmStepCount,
            kmTotalN,
            ...(logRank !== null ? { kmLogRankP: logRank.pValue } : {}),
        };
    }

    if (spec.kind === "barError" && plotData.kind === "barError") {
        return {
            ...base,
            barErrorType: ERROR_BAR_LABELS[spec.errorBarType],
            barGroupCount: plotData.groups.length,
        };
    }

    if (spec.kind === "box" && plotData.kind === "box") {
        const boxOutlierCount = plotData.groups.reduce(
            (sum, group) => sum + (group.kind === "box" ? group.outliers.length : 0),
            0,
        );

        return {
            ...base,
            boxGroupCount: plotData.groups.length,
            boxOutlierCount,
        };
    }

    if (spec.kind === "xy") {
        if (plotData.kind === "xy") {
            const xyPointCount = plotData.groups.reduce((sum, group) => sum + group.points.length, 0);
            const firstR2 = plotData.regressions[0]?.r2;
            const xyRSquared =
                firstR2 !== undefined ? Math.round(firstR2 * 1000) / 1000 : undefined;

            return {
                ...base,
                xyPointCount,
                xyRSquared,
            };
        }

        if (plotData.kind === "longitudinal") {
            const xyPointCount = plotData.groups.reduce((sum, group) => sum + group.points.length, 0);

            return {
                ...base,
                xyPointCount,
            };
        }
    }

    return base;
};
