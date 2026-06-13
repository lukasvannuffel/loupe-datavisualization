"use client";

// File budget exception: <200 lines (vs typical <140). XYChart dispatches scatter, line,
// longitudinal, regression, error bands, and the two-pass label margin in one surface.

import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { useEffect, useState } from "react";

import type {
    LongitudinalData,
    XYPlotData,
} from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { UserPalette } from "@/app/palettes/schemas";
import type { SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { XYSpec } from "@/lib/chartSpec/types";

import { applyAxes } from "./applyAxes";
import { applyChartLabels, clearStaticChartLabels, marginWithLabels } from "./applyChartLabels";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import { ChartLabelLayer } from "./ChartLabelLayer";
import { chartLabelLayout } from "./chartLabelLayout";
import type { Margin } from "./chart.types";
import { DEFAULT_MARGIN } from "./chart.types";
import { ChartLegend } from "@/components/charts/legend/ChartLegend";

import { drawHorizontalGrid } from "./drawHorizontalGrid";
import { resolvePalette } from "./palettes";
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
    readonly userPalettes?: readonly UserPalette[];
    readonly onSpecChange?: (updater: SpecUpdater) => void;
};

const isLongitudinal = (d: XYPlotData | LongitudinalData): d is LongitudinalData =>
    d.kind === "longitudinal";

export const XYChart = ({
    spec,
    data,
    mode,
    showRegression,
    showErrorBands = false,
    userPalettes = [],
    onSpecChange,
}: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
    const [extraBottomPx, setExtraBottomPx] = useState(0);
    const longitudinal = isLongitudinal(data);
    const labels = resolveChartLabels(spec);
    const palette = resolvePalette(spec, userPalettes);
    const editable = onSpecChange !== undefined;
    const labelMargin = marginWithLabels(DEFAULT_MARGIN);

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
        clearStaticChartLabels(svgEl);

        const draw = (margin: Margin): number => {
            const innerWidth = Math.max(0, dims.width - margin.left - margin.right);
            const innerHeight = Math.max(0, CHART_MIN_HEIGHT - margin.top - margin.bottom);
            svg.selectAll("g.chart-plot, g.chart-axes").remove();

            const plotG = svg
                .append("g")
                .attr("class", "chart-plot")
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

            if (spec.showGrid) {
                drawHorizontalGrid(plotG, yScale, innerWidth, tokens);
            }

            renderXYChartGroups(data, plotG, {
                mode,
                palette: resolvePalette(spec, userPalettes),
                showRegression,
                showErrorBands,
                strokeWeight: spec.strokeWeight,
                userPalettes,
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

            if (!editable) {
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
            }

            return axisResult.extraBottomPx;
        };

        const extraBottom = draw(labelMargin);
        setExtraBottomPx(extraBottom > 0 ? extraBottom : 0);
        if (extraBottom > 0) {
            draw({ ...labelMargin, bottom: labelMargin.bottom + extraBottom });
        }
    }, [
        data,
        dims,
        editable,
        labels,
        longitudinal,
        mode,
        palette,
        showErrorBands,
        showRegression,
        spec.showGrid,
        spec.strokeWeight,
        spec,
        userPalettes,
    ]);

    const innerWidth =
        dims !== null ? Math.max(0, dims.width - labelMargin.left - labelMargin.right) : 0;
    const innerHeight =
        dims !== null ? Math.max(0, CHART_MIN_HEIGHT - labelMargin.top - labelMargin.bottom) : 0;
    const layout =
        dims !== null && editable
            ? chartLabelLayout(
                  { width: dims.width, height: CHART_MIN_HEIGHT },
                  labelMargin,
                  innerWidth,
                  innerHeight,
                  extraBottomPx,
              )
            : null;

    return (
        <div className="chart-with-legend" data-testid="xy-chart" style={{ width: "100%" }}>
            <div
                ref={containerRef}
                className="chart-surface"
                style={{ position: "relative", width: "100%", minHeight: CHART_MIN_HEIGHT }}
            >
                <svg className="rec-chart-svg" role="img" aria-label={labels.title} />
                {editable && dims !== null && layout !== null && onSpecChange !== undefined ? (
                    <div
                        className="chart-labels-host"
                        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                    >
                        <ChartLabelLayer
                            dimensions={{ width: dims.width, height: CHART_MIN_HEIGHT }}
                            layout={layout}
                            spec={spec}
                            onSpecChange={onSpecChange}
                        />
                    </div>
                ) : null}
            </div>
            <ChartLegend
                chartKind="xy"
                groups={data.groups}
                mode={mode}
                palette={palette}
                userPalettes={userPalettes}
            />
        </div>
    );
};
