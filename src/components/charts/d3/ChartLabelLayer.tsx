"use client";

import { InlineEditableText } from "@/components/customization/InlineEditableText";
import {
    updateAxisLabel,
    updateCustomizationTitle,
    type SpecUpdater,
} from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { ChartSpec } from "@/lib/chartSpec/types";

import type { ChartLabelLayout } from "./chartLabelLayout";
import type { Dimensions } from "./chart.types";

type ChartLabelLayerProps = {
    readonly spec: ChartSpec;
    readonly onSpecChange: (updater: SpecUpdater) => void;
    readonly dimensions: Dimensions;
    readonly layout: ChartLabelLayout;
};

export const ChartLabelLayer = ({
    spec,
    onSpecChange,
    dimensions,
    layout,
}: ChartLabelLayerProps): JSX.Element => {
    const labels = resolveChartLabels(spec);

    return (
        <svg
            className="chart-labels-layer"
            aria-hidden="true"
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            style={{ pointerEvents: "none" }}
        >
            <InlineEditableText
                dataRole="chart-title"
                fontFamily='var(--font-serif, "Source Serif 4", Georgia, serif)'
                fontSize={14}
                foreignX={layout.title.foreignX}
                foreignY={layout.title.foreignY}
                height={layout.title.editHeight}
                textAnchor={layout.title.textAnchor}
                value={labels.title}
                width={layout.title.editWidth}
                x={layout.title.x}
                y={layout.title.y}
                onChange={(next) => {
                    onSpecChange((prev) => updateCustomizationTitle(prev, next));
                }}
            />
            <InlineEditableText
                dataRole="axis-label-x"
                foreignX={layout.x.foreignX}
                foreignY={layout.x.foreignY}
                height={layout.x.editHeight}
                textAnchor={layout.x.textAnchor}
                value={labels.xLabel}
                width={layout.x.editWidth}
                x={layout.x.x}
                y={layout.x.y}
                onChange={(next) => {
                    onSpecChange((prev) => updateAxisLabel(prev, "x", next));
                }}
            />
            <InlineEditableText
                dataRole="axis-label-y"
                foreignX={layout.y.foreignX}
                foreignY={layout.y.foreignY}
                height={layout.y.editHeight}
                rotate={layout.y.rotate}
                textAnchor={layout.y.textAnchor}
                value={labels.yLabel}
                width={layout.y.editWidth}
                x={layout.y.x}
                y={layout.y.y}
                onChange={(next) => {
                    onSpecChange((prev) => updateAxisLabel(prev, "y", next));
                }}
            />
        </svg>
    );
};
