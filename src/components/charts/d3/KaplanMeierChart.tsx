"use client";

// File budget exception: <140 lines (vs typical <120). KM ships with CI bands,
// censoring ticks, and an at-risk table coordinated to the x-scale — the
// orchestration legitimately needs more lines than a bar chart.

import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { useEffect, useState } from "react";

import type { KMPlotData } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import type { UserPalette } from "@/app/palettes/schemas";
import type { SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { LogRankResult } from "@/lib/chartSpec/aggregators/kmLogRank";
import type { KMSpec } from "@/lib/chartSpec/types";

import { applyAxes, axisTickCountForWidth } from "./applyAxes";
import { applyChartLabels, clearStaticChartLabels, marginWithLabels } from "./applyChartLabels";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import { AtRiskTable } from "./atRiskTable";
import { ChartLabelLayer } from "./ChartLabelLayer";
import { chartLabelLayout } from "./chartLabelLayout";
import { DEFAULT_MARGIN } from "./chart.types";
import { ChartLegend } from "@/components/charts/legend/ChartLegend";

import { drawHorizontalGrid } from "./drawHorizontalGrid";
import { colorByIndex, resolvePalette } from "./palettes";
import { drawKMCurve } from "./kmCurves";
import { drawKmStatAnnotation, resolveKmStatLines } from "./kmStatsAnnotation";
import { useResizeObserver } from "./useResizeObserver";

const CHART_MIN_HEIGHT = 240;
const LABEL_MARGIN = marginWithLabels(DEFAULT_MARGIN);

type Props = {
    readonly spec: KMSpec;
    readonly data: KMPlotData;
    readonly logRank?: LogRankResult | null;
    readonly userPalettes?: readonly UserPalette[];
    readonly onSpecChange?: (updater: SpecUpdater) => void;
};

export const KaplanMeierChart = ({
    spec,
    data,
    logRank,
    userPalettes = [],
    onSpecChange,
}: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
    const [extraBottomPx, setExtraBottomPx] = useState(0);
    const labels = resolveChartLabels(spec);
    const palette = resolvePalette(spec, userPalettes);
    const editable = onSpecChange !== undefined;

    useEffect(() => {
        if (!dims || !containerRef.current || data.groups.length === 0) {
            return;
        }

        const svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) {
            return;
        }

        const chartHeight = CHART_MIN_HEIGHT;
        const svg = select(svgEl);
        svg
            .attr("width", dims.width)
            .attr("height", chartHeight)
            .attr("viewBox", `0 0 ${dims.width} ${chartHeight}`);

        const tokens = readDesignTokens();
        applyDesignTokens(svg, tokens);
        const margin = LABEL_MARGIN;
        const innerWidth = Math.max(0, dims.width - margin.left - margin.right);
        const innerHeight = Math.max(0, chartHeight - margin.top - margin.bottom);
        clearStaticChartLabels(svgEl);
        svg.selectAll("g.chart-plot, g.chart-axes").remove();

        const plotG = svg
            .append("g")
            .attr("class", "chart-plot")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        const xScale: ScaleLinear<number, number> = scaleLinear()
            .domain([0, data.tMax])
            .range([0, innerWidth]);
        const yScale: ScaleLinear<number, number> = scaleLinear()
            .domain([0, 1])
            .range([innerHeight, 0]);

        if (spec.showGrid) {
            drawHorizontalGrid(plotG, yScale, innerWidth, tokens);
        }

        const palette = resolvePalette(spec, userPalettes);
        const groupCount = data.groups.length;

        data.groups.forEach((group, index) => {
            const styleIndex = Math.min(index, 3) as 0 | 1 | 2 | 3;
            const color = colorByIndex(palette, styleIndex, groupCount, userPalettes);
            const g = plotG
                .append("g")
                .attr("class", "km-group")
                .attr("data-group-index", String(index));
            drawKMCurve(g, group, xScale, yScale, styleIndex, color, spec.strokeWeight);
        });

        if (spec.showStats) {
            const statLines = resolveKmStatLines(logRank);

            if (statLines.length > 0) {
                drawKmStatAnnotation(plotG, innerWidth, tokens, statLines);
            }
        }

        const axisResult = applyAxes(
            {
                svg: svgEl,
                dimensions: { width: dims.width, height: chartHeight },
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
                    dimensions: { width: dims.width, height: chartHeight },
                    margin,
                    innerWidth,
                    innerHeight,
                },
                labels,
                tokens,
                extraBottomPx: axisResult.extraBottomPx,
            });
        }

        setExtraBottomPx(axisResult.extraBottomPx);
    }, [
        data,
        dims,
        editable,
        labels,
        palette,
        spec.showGrid,
        spec.showStats,
        spec.strokeWeight,
        logRank,
        userPalettes,
    ]);

    const marginLeft = LABEL_MARGIN.left;
    const innerWidth =
        dims !== null ? Math.max(0, dims.width - marginLeft - DEFAULT_MARGIN.right) : 0;
    const tickCount = dims !== null ? axisTickCountForWidth(dims.width) : 6;
    const xScaleForTable =
        dims !== null
            ? scaleLinear().domain([0, data.tMax]).range([0, innerWidth])
            : scaleLinear().domain([0, 1]).range([0, 0]);
    const innerHeight =
        dims !== null ? Math.max(0, CHART_MIN_HEIGHT - LABEL_MARGIN.top - LABEL_MARGIN.bottom) : 0;
    const layout =
        dims !== null && editable
            ? chartLabelLayout(
                  { width: dims.width, height: CHART_MIN_HEIGHT },
                  LABEL_MARGIN,
                  Math.max(0, dims.width - LABEL_MARGIN.left - LABEL_MARGIN.right),
                  innerHeight,
                  extraBottomPx,
              )
            : null;

    return (
        <div style={{ width: "100%" }}>
            <div className="chart-with-legend" style={{ width: "100%" }}>
                <div
                    ref={containerRef}
                    className="chart-surface"
                    style={{
                        flexShrink: 0,
                        height: CHART_MIN_HEIGHT,
                        overflow: "hidden",
                        position: "relative",
                        width: "100%",
                    }}
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
                    chartKind="km"
                    groups={data.groups}
                    palette={palette}
                    userPalettes={userPalettes}
                />
            </div>
            {spec.showAtRisk && dims !== null ? (
                <AtRiskTable
                    groups={data.groups}
                    innerWidth={innerWidth}
                    marginLeft={marginLeft}
                    tickCount={tickCount}
                    xScale={xScaleForTable}
                />
            ) : null}
        </div>
    );
};
