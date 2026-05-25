"use client";

// File budget exception: <140 lines (vs typical <120). KM ships with CI bands,
// censoring ticks, and an at-risk table coordinated to the x-scale — the
// orchestration legitimately needs more lines than a bar chart.

import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { useEffect } from "react";

import type { KMPlotData } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { KMSpec } from "@/lib/chartSpec/types";

import { applyAxes, axisTickCountForWidth } from "./applyAxes";
import { applyChartLabels, marginWithLabels } from "./applyChartLabels";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import { AtRiskTable } from "./atRiskTable";
import { DEFAULT_MARGIN } from "./chart.types";
import { drawKMCurve, GROUP_COLORS } from "./kmCurves";
import { useResizeObserver } from "./useResizeObserver";

const CHART_MIN_HEIGHT = 240;

type Props = {
    readonly spec: KMSpec;
    readonly data: KMPlotData;
};

const LABEL_MARGIN = marginWithLabels(DEFAULT_MARGIN);

export const KaplanMeierChart = ({ spec, data }: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
    const labels = resolveChartLabels(spec);

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
        svg.selectAll("*").remove();

        const plotG = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const xScale: ScaleLinear<number, number> = scaleLinear()
            .domain([0, data.tMax])
            .range([0, innerWidth]);
        const yScale: ScaleLinear<number, number> = scaleLinear()
            .domain([0, 1])
            .range([innerHeight, 0]);

        if (spec.showGrid) {
            plotG
                .append("g")
                .attr("class", "km-grid")
                .selectAll("line")
                .data(yScale.ticks(5))
                .join("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", (t) => yScale(t))
                .attr("y2", (t) => yScale(t))
                .attr("stroke", tokens.hairline)
                .attr("stroke-width", 0.6);
        }

        data.groups.forEach((group, index) => {
            const styleIndex = Math.min(index, 3) as 0 | 1 | 2 | 3;
            const color = GROUP_COLORS[styleIndex] ?? GROUP_COLORS[0];
            const g = plotG.append("g").attr("class", "km-group");
            drawKMCurve(g, group, xScale, yScale, styleIndex, color);
        });

        // Single-pass axis draw: unlike band-scale charts (BarErrorChart), KM's x-axis
        // uses numeric tick labels that don't overflow horizontally, so applyAxes never
        // reports extraBottomPx > 0. If a future variant adds categorical x-axis labels
        // (unlikely for survival time), restore the two-pass pattern from BarErrorChart.
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
    }, [spec, data, dims]);

    const marginLeft = LABEL_MARGIN.left;
    const innerWidth =
        dims !== null ? Math.max(0, dims.width - marginLeft - DEFAULT_MARGIN.right) : 0;
    const tickCount = dims !== null ? axisTickCountForWidth(dims.width) : 6;
    const xScaleForTable =
        dims !== null
            ? scaleLinear().domain([0, data.tMax]).range([0, innerWidth])
            : scaleLinear().domain([0, 1]).range([0, 0]);

    return (
        <div style={{ width: "100%" }}>
            <div
                ref={containerRef}
                style={{
                    flexShrink: 0,
                    height: CHART_MIN_HEIGHT,
                    overflow: "hidden",
                    width: "100%",
                }}
            >
                <svg className="rec-chart-svg" role="img" aria-label={labels.title} />
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
