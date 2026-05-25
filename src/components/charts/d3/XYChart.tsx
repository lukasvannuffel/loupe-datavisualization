"use client";

import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { useEffect } from "react";

import type {
    LongitudinalData,
    XYPlotData,
} from "@/lib/chartSpec/aggregators/xyPlot.types";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { XYSpec } from "@/lib/chartSpec/types";

import { applyAxes } from "./applyAxes";
import { applyChartLabels, marginWithLabels } from "./applyChartLabels";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import type { Margin } from "./chart.types";
import { DEFAULT_MARGIN } from "./chart.types";
import { renderXYChartGroups } from "./xyGlyphs";
import { useResizeObserver } from "./useResizeObserver";

const CHART_MIN_HEIGHT = 240;
const AXIS_PADDING_RATIO = 0.05;

type Props = {
    readonly spec: XYSpec;
    readonly data: XYPlotData | LongitudinalData;
    readonly mode: "line" | "scatter" | "both";
    readonly showRegression: boolean;
    readonly showErrorBands?: boolean;
};

const isLongitudinal = (d: XYPlotData | LongitudinalData): d is LongitudinalData =>
    d.kind === "longitudinal";

export const XYChart = ({
    spec,
    data,
    mode,
    showRegression,
    showErrorBands = false,
}: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
    const longitudinal = isLongitudinal(data);
    const labels = resolveChartLabels(spec);

    useEffect(() => {
        if (!dims || !containerRef.current || data.groups.length === 0) {
            return;
        }

        const svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) {
            return;
        }

        const svg = select(svgEl);
        svg
            .attr("width", dims.width)
            .attr("height", CHART_MIN_HEIGHT)
            .attr("viewBox", `0 0 ${dims.width} ${CHART_MIN_HEIGHT}`);

        const tokens = readDesignTokens();
        applyDesignTokens(svg, tokens);
        const labelMargin = marginWithLabels(DEFAULT_MARGIN);

        const draw = (margin: Margin): number => {
            const innerWidth = Math.max(0, dims.width - margin.left - margin.right);
            const innerHeight = Math.max(0, CHART_MIN_HEIGHT - margin.top - margin.bottom);
            svg.selectAll("*").remove();

            const plotG = svg
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            const xSpan = Math.max(data.xMax - data.xMin, 1e-6);
            const ySpan = Math.max(data.yMax - data.yMin, 1e-6);
            const xScale: ScaleLinear<number, number> = scaleLinear()
                .domain([
                    data.xMin - xSpan * AXIS_PADDING_RATIO,
                    data.xMax + xSpan * AXIS_PADDING_RATIO,
                ])
                .range([0, innerWidth])
                .nice();
            const yScale: ScaleLinear<number, number> = scaleLinear()
                .domain([
                    data.yMin - ySpan * AXIS_PADDING_RATIO,
                    data.yMax + ySpan * AXIS_PADDING_RATIO,
                ])
                .range([innerHeight, 0])
                .nice();

            renderXYChartGroups(data, plotG, {
                mode,
                showRegression,
                showErrorBands,
                xScale,
                yScale,
            });

            const axisResult = applyAxes(
                {
                    svg: svgEl,
                    dimensions: { width: dims.width, height: CHART_MIN_HEIGHT },
                    margin,
                    innerWidth,
                    innerHeight,
                },
                xScale,
                yScale,
                tokens,
            );
            applyChartLabels({
                ctx: {
                    svg: svgEl,
                    dimensions: { width: dims.width, height: CHART_MIN_HEIGHT },
                    margin,
                    innerWidth,
                    innerHeight,
                },
                labels,
                tokens,
                extraBottomPx: axisResult.extraBottomPx,
            });

            return axisResult.extraBottomPx;
        };

        const extraBottom = draw(labelMargin);
        if (extraBottom > 0) {
            draw({ ...labelMargin, bottom: labelMargin.bottom + extraBottom });
        }
    }, [data, dims, labels, longitudinal, mode, showErrorBands, showRegression]);

    return (
        <div
            ref={containerRef}
            data-testid="xy-chart"
            style={{ width: "100%", minHeight: CHART_MIN_HEIGHT }}
        >
            <svg className="rec-chart-svg" role="img" aria-label={labels.title} />
        </div>
    );
};
