"use client";

import type { LoupeDataset } from "@/app/providers";
import { BarErrorChart } from "@/components/charts/d3/BarErrorChart";
import { BoxChart } from "@/components/charts/d3/BoxChart";
import { KaplanMeierChart } from "@/components/charts/d3/KaplanMeierChart";
import { XYChart } from "@/components/charts/d3/XYChart";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { mappingForBarError } from "@/components/pages/recommendation/barErrorMapping";
import { aggregateBarError } from "@/lib/chartSpec/aggregators/barError";
import { aggregateBoxPlot } from "@/lib/chartSpec/aggregators/boxPlot";
import { BoxPlotError } from "@/lib/chartSpec/aggregators/boxPlot.types";
import { aggregateKaplanMeier } from "@/lib/chartSpec/aggregators/kaplanMeier";
import { KaplanMeierError } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import { aggregateLongitudinal } from "@/lib/chartSpec/aggregators/longitudinalAggregator";
import { aggregateXYPlot } from "@/lib/chartSpec/aggregators/xyPlot";
import { LongitudinalError, XYPlotError } from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { BoxPlotData } from "@/lib/chartSpec/aggregators/boxPlot.types";
import type { KMPlotData } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import type { LongitudinalData, XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { ChartSpec, StatTest } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

type SpecChartPanelProps = {
    readonly chartKind: ChartSpec["kind"];
    readonly dataset: LoupeDataset;
    readonly mapping: Mapping;
    readonly spec: ChartSpec;
    readonly statTests?: readonly StatTest[];
    readonly onSpecChange?: (updater: SpecUpdater) => void;
};

const ChartError = ({ message }: { readonly message: string }): JSX.Element => (
    <div className="rec-chart-empty muted" role="alert">
        <p>{message}</p>
    </div>
);

export const SpecChartPanel = ({
    chartKind,
    dataset,
    mapping,
    spec,
    statTests,
    onSpecChange,
}: SpecChartPanelProps): JSX.Element => {
    if (chartKind === "barError" && spec.kind === "barError") {
        const barErrorMapResult = mappingForBarError(mapping, dataset.inferences);
        const barErrorAggregation = aggregateBarError(dataset.rows, barErrorMapResult.mapping);

        if (barErrorAggregation.groups.length === 0) {
            return (
                <div className="rec-chart-empty muted" role="status">
                    <p>No plottable groups for this chart.</p>
                </div>
            );
        }

        return (
            <BarErrorChart
                groups={barErrorAggregation.groups}
                spec={spec}
                onSpecChange={onSpecChange}
            />
        );
    }

    if (chartKind === "km" && spec.kind === "km") {
        if (mapping.time === undefined || mapping.event === undefined) {
            return (
                <div className="rec-chart-empty muted" role="status">
                    <p>Assign time and event columns on the map step.</p>
                </div>
            );
        }

        let kmData: KMPlotData | undefined;
        let kmError: string | undefined;

        try {
            kmData = aggregateKaplanMeier(dataset.rows, mapping);
        }
        catch (err) {
            if (err instanceof KaplanMeierError) {
                kmError = err.message;
            }
            else {
                throw err;
            }
        }

        if (kmError !== undefined) {
            return <ChartError message={kmError} />;
        }

        if (kmData !== undefined) {
            return (
                <KaplanMeierChart
                    data={kmData}
                    spec={spec}
                    statTests={statTests}
                    onSpecChange={onSpecChange}
                />
            );
        }
    }

    if (chartKind === "box" && spec.kind === "box") {
        if (mapping.outcome === undefined) {
            return (
                <div className="rec-chart-empty muted" role="status">
                    <p>Assign an outcome column on the map step.</p>
                </div>
            );
        }

        let boxData: BoxPlotData | undefined;
        let boxError: string | undefined;

        try {
            boxData = aggregateBoxPlot(dataset.rows, mapping);
        }
        catch (err) {
            if (err instanceof BoxPlotError) {
                boxError = err.message;
            }
            else {
                throw err;
            }
        }

        if (boxError !== undefined) {
            return <ChartError message={boxError} />;
        }

        if (boxData !== undefined) {
            return <BoxChart data={boxData} spec={spec} onSpecChange={onSpecChange} />;
        }
    }

    if (chartKind === "xy" && spec.kind === "xy") {
        if (mapping.x === undefined || mapping.y === undefined) {
            return (
                <div className="rec-chart-empty muted" role="status">
                    <p>Assign X and Y columns on the map step.</p>
                </div>
            );
        }

        const useLongitudinal =
            spec.mode === "line" || (spec.mode === "both" && mapping.id !== undefined);

        let xyData: XYPlotData | LongitudinalData | undefined;
        let xyError: string | undefined;

        try {
            xyData = useLongitudinal
                ? aggregateLongitudinal(dataset.rows, mapping)
                : aggregateXYPlot(dataset.rows, mapping, {
                      computeRegression: spec.showRegression,
                  });
        }
        catch (err) {
            if (err instanceof XYPlotError || err instanceof LongitudinalError) {
                xyError = err.message;
            }
            else {
                throw err;
            }
        }

        if (xyError !== undefined) {
            return <ChartError message={xyError} />;
        }

        if (xyData !== undefined) {
            return (
                <XYChart
                    data={xyData}
                    mode={spec.mode}
                    showErrorBands={spec.showErrorBands}
                    showRegression={spec.showRegression}
                    spec={spec}
                    onSpecChange={onSpecChange}
                />
            );
        }
    }

    return <ChartRenderer spec={spec} />;
};
