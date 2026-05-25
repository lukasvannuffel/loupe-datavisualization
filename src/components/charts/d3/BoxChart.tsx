"use client";

// File budget exception: <140 lines (vs typical <120). BoxChart dispatches
// between box and strip rendering, runs the two-pass label rotation, and
// conditionally renders a sample-size caption — legitimately more orchestration
// than a single-mode chart.

import { scaleBand, scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { useEffect } from "react";

import type { BoxPlotData } from "@/lib/chartSpec/aggregators/boxPlot.types";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { BoxSpec } from "@/lib/chartSpec/types";

import { applyAxes } from "./applyAxes";
import { applyChartLabels, marginWithLabels } from "./applyChartLabels";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import { drawBoxGlyph, drawStripGlyph } from "./boxGlyphs";
import type { Margin } from "./chart.types";
import { DEFAULT_MARGIN } from "./chart.types";
import { useResizeObserver } from "./useResizeObserver";

const CHART_MIN_HEIGHT = 240;
const Y_PADDING_RATIO = 0.05;
const BOX_WIDTH_RATIO = 0.6;

type Props = {
    readonly data: BoxPlotData;
    readonly spec: BoxSpec;
};

export const BoxChart = ({ data, spec }: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
    const hasStripGroup = data.groups.some((group) => group.kind === "strip");
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
            const ySpan = Math.max(data.yMax - data.yMin, 1e-6);
            const yScale: ScaleLinear<number, number> = scaleLinear()
                .domain([data.yMin - ySpan * Y_PADDING_RATIO, data.yMax + ySpan * Y_PADDING_RATIO])
                .range([innerHeight, 0])
                .nice();
            const xScale = scaleBand<string>()
                .domain(data.groups.map((group) => group.label))
                .range([0, innerWidth])
                .padding(0.25);
            const boxWidth = xScale.bandwidth() * BOX_WIDTH_RATIO;
            const stripLabelY = innerHeight + 14;

            data.groups.forEach((group) => {
                const bandX = xScale(group.label);
                if (bandX === undefined) {
                    return;
                }

                const xCenter = bandX + xScale.bandwidth() / 2;
                const groupG = plotG.append("g").attr("class", `box-group-${group.label}`);

                if (group.kind === "box") {
                    drawBoxGlyph(groupG, group, xCenter, boxWidth, yScale, {
                        notched: spec.notched,
                        showMeanMarker: spec.showMeanMarker,
                        showOutliers: spec.showOutliers,
                    }, tokens);
                }
                else {
                    drawStripGlyph(groupG, group, xCenter, yScale, stripLabelY, tokens);
                }
            });

            const axisResult = applyAxes(
                { svg: svgEl, dimensions: { width: dims.width, height: CHART_MIN_HEIGHT }, margin, innerWidth, innerHeight },
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
    }, [data, spec, dims]);

    return (
        <div ref={containerRef} data-testid="box-chart" style={{ width: "100%", minHeight: CHART_MIN_HEIGHT }}>
            <svg className="rec-chart-svg" role="img" aria-label={labels.title} />
            {hasStripGroup ? (
                <p className="rec-box-strip-caption muted small">
                    Note: groups with n&lt;5 are shown as individual points; quartile-based summaries
                    require at least 5 observations.
                </p>
            ) : null}
        </div>
    );
};
