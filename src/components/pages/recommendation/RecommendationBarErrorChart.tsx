import type { LoupeDataset } from "@/app/providers";
import { SpecChartPanel } from "@/components/charts/SpecChartPanel";
import type { BarErrorAggregation } from "@/lib/chartSpec/aggregators/barError.types";
import type { ChartSpec } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import { ErrorBarsUnavailable } from "./ErrorBarsUnavailable";
import { MissingDataWarning } from "./MissingDataWarning";
import type { BarErrorMappingResult } from "./barErrorMapping";

/** Exclusive threshold: exactly 5% drop rate does not show MissingDataWarning. */
const MISSING_DATA_WARN_DROP_RATE = 0.05;

type RecommendationBarErrorChartProps = {
    readonly barErrorAggregation: BarErrorAggregation;
    readonly barErrorMapResult: BarErrorMappingResult;
    readonly barErrorMapping: Mapping;
    readonly chartKind: ChartSpec["kind"];
    readonly dataset: LoupeDataset;
    readonly liveSpec: ChartSpec;
    readonly mapping: Mapping;
};

export const RecommendationBarErrorChart = ({
    barErrorAggregation,
    barErrorMapResult,
    barErrorMapping,
    chartKind,
    dataset,
    liveSpec,
    mapping,
}: RecommendationBarErrorChartProps): JSX.Element => (
    <>
        {barErrorAggregation.missing.dropRate > MISSING_DATA_WARN_DROP_RATE ? (
            <MissingDataWarning info={barErrorAggregation.missing} />
        ) : null}
        {barErrorMapResult.inferredOutcome !== undefined ? (
            <p className="rec-inferred-outcome muted small" role="status">
                Outcome column inferred:{" "}
                <strong className="mono">{barErrorMapResult.inferredOutcome}</strong> — confirm on the
                map step.
            </p>
        ) : null}
        {barErrorAggregation.groups.length === 0 ? (
            <div className="rec-chart-empty muted" role="status">
                <p>
                    No plottable groups yet. On the map step, assign <strong>Group / arm</strong> and{" "}
                    <strong>Outcome</strong> to categorical and numeric columns (e.g. treatment +
                    blood pressure change).
                </p>
                {barErrorMapping.outcome === undefined || barErrorMapping.group === undefined ? (
                    <p className="small">
                        Missing: {barErrorMapping.group === undefined ? "group" : ""}
                        {barErrorMapping.group === undefined && barErrorMapping.outcome === undefined
                            ? " · "
                            : ""}
                        {barErrorMapping.outcome === undefined ? "outcome" : ""}
                    </p>
                ) : (
                    <p className="small">
                        Rows may use non-numeric outcomes (check decimal commas) or missing values in
                        those columns.
                    </p>
                )}
            </div>
        ) : (
            <>
                <SpecChartPanel
                    chartKind={chartKind}
                    dataset={dataset}
                    mapping={mapping}
                    spec={liveSpec}
                />
                <ErrorBarsUnavailable groups={barErrorAggregation.groups} />
            </>
        )}
    </>
);
