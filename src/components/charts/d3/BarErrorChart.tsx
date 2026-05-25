"use client";

// File budget exception: <200 lines (vs typical <140). BarErrorChart coordinates
// band scales, error caps, two-pass bottom margin, and optional label overlay.

import { max, min } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { useEffect, useState } from "react";

import { computeErrorBar } from "@/lib/chartSpec/aggregators/errorBars";
import type { GroupStats } from "@/lib/chartSpec/aggregators/barError.types";
import type { SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import type { BarErrorSpec } from "@/lib/chartSpec/types";

import { ChartLegend } from "@/components/charts/legend/ChartLegend";

import { colorByIndex, resolvePalette } from "./palettes";
import { applyAxes } from "./applyAxes";
import { applyChartLabels, clearStaticChartLabels, marginWithLabels } from "./applyChartLabels";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import { ChartLabelLayer } from "./ChartLabelLayer";
import { chartLabelLayout } from "./chartLabelLayout";
import type { Margin } from "./chart.types";
import { DEFAULT_MARGIN } from "./chart.types";
import { useResizeObserver } from "./useResizeObserver";

type Props = {
    readonly spec: BarErrorSpec;
    readonly groups: ReadonlyArray<GroupStats>;
    readonly onSpecChange?: (updater: SpecUpdater) => void;
};

export const BarErrorChart = ({ spec, groups, onSpecChange }: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
    const [extraBottomPx, setExtraBottomPx] = useState(0);
    const labels = resolveChartLabels(spec);
    const editable = onSpecChange !== undefined;
    const labelMargin = marginWithLabels(DEFAULT_MARGIN);

    useEffect(() => {
        if (!dims || !containerRef.current || groups.length === 0) {
            return;
        }

        const svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) {
            return;
        }

        const svg = select(svgEl);
        svg
            .attr("width", dims.width)
            .attr("height", dims.height)
            .attr("viewBox", `0 0 ${dims.width} ${dims.height}`);

        const tokens = readDesignTokens();
        applyDesignTokens(svg, tokens);
        clearStaticChartLabels(svgEl);

        const draw = (margin: Margin): number => {
            const innerWidth = Math.max(0, dims.width - margin.left - margin.right);
            const innerHeight = Math.max(0, dims.height - margin.top - margin.bottom);
            svg.selectAll("g.chart-plot, g.chart-axes").remove();

            const g = svg
                .append("g")
                .attr("class", "chart-plot")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            const xScale = scaleBand<string>()
                .domain(groups.map((c) => c.label))
                .range([0, innerWidth])
                .padding(0.25);
            const yLo = Math.min(
                0,
                min(groups, (c) => c.mean - computeErrorBar(c, spec.errorBarType)) ?? 0,
            );
            const yHi = Math.max(
                0,
                max(groups, (c) => c.mean + computeErrorBar(c, spec.errorBarType)) ?? 0,
            );
            const ySpan = Math.max(yHi - yLo, 1e-6);
            const yScale: ScaleLinear<number, number> = scaleLinear()
                .domain([yLo - ySpan * 0.05, yHi + ySpan * 0.1])
                .range([innerHeight, 0])
                .nice();
            const baselineY = yScale(0);
            const palette = resolvePalette(spec);
            const groupCount = groups.length;

            g.selectAll("rect.bar")
                .data(groups)
                .join("rect")
                .attr("class", "bar")
                .attr("data-role", "bar-rect")
                .attr("data-group-index", (_d, index) => String(index))
                .attr("x", (d) => xScale(d.label) as number)
                .attr("y", (d) => Math.min(yScale(d.mean), baselineY))
                .attr("width", xScale.bandwidth())
                .attr("height", (d) => Math.abs(baselineY - yScale(d.mean)))
                .attr("fill", (_d, index) =>
                    colorByIndex(palette, Math.min(index, 3) as 0 | 1 | 2 | 3, groupCount),
                )
                .attr("opacity", 0.85);

            const errors = g.append("g").attr("class", "errors");
            const capW = Math.min(8, xScale.bandwidth() / 3);
            groups.forEach((c) => {
                const errorMag = computeErrorBar(c, spec.errorBarType);
                if (errorMag <= 0) {
                    return;
                }
                const bandX = xScale(c.label);
                if (bandX === undefined) {
                    return;
                }
                const cx = bandX + xScale.bandwidth() / 2;
                const yTop = yScale(c.mean + errorMag);
                const yBot = yScale(c.mean - errorMag);
                const line = (x1: number, x2: number, y1: number, y2: number): void => {
                    errors
                        .append("line")
                        .attr("x1", x1)
                        .attr("x2", x2)
                        .attr("y1", y1)
                        .attr("y2", y2)
                        .attr("stroke", tokens.ink)
                        .attr("stroke-width", 1.5);
                };
                line(cx, cx, yTop, yBot);
                line(cx - capW, cx + capW, yTop, yTop);
                line(cx - capW, cx + capW, yBot, yBot);
            });

            const axisResult = applyAxes(
                { svg: svgEl, dimensions: dims, margin, innerWidth, innerHeight },
                xScale,
                yScale,
                tokens,
            );

            if (!editable) {
                applyChartLabels({
                    ctx: { svg: svgEl, dimensions: dims, margin, innerWidth, innerHeight },
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
    }, [dims, editable, groups, labels, spec.customizations?.palette, spec.errorBarType, spec]);

    const innerWidth =
        dims !== null ? Math.max(0, dims.width - labelMargin.left - labelMargin.right) : 0;
    const innerHeight =
        dims !== null ? Math.max(0, dims.height - labelMargin.top - labelMargin.bottom) : 0;
    const layout =
        dims !== null && editable
            ? chartLabelLayout(dims, labelMargin, innerWidth, innerHeight, extraBottomPx)
            : null;

    const palette = resolvePalette(spec);

    return (
        <div className="chart-with-legend" style={{ width: "100%" }}>
            <div
                ref={containerRef}
                className="chart-surface"
                style={{ position: "relative", width: "100%", minHeight: 240 }}
            >
                <svg className="rec-chart-svg" role="img" aria-label={labels.title} />
                {editable && dims !== null && layout !== null && onSpecChange !== undefined ? (
                    <div
                        className="chart-labels-host"
                        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                    >
                        <ChartLabelLayer
                            dimensions={dims}
                            layout={layout}
                            spec={spec}
                            onSpecChange={onSpecChange}
                        />
                    </div>
                ) : null}
            </div>
            <ChartLegend chartKind="bar" groups={groups} palette={palette} />
        </div>
    );
};
