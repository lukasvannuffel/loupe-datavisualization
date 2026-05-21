"use client";

import { max, min } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { memo, useEffect, useLayoutEffect } from "react";

import type { BarErrorPlotData, BarErrorSpec } from "@/lib/chartSpec/types";

import { applyAxes } from "./applyAxes";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import { DEFAULT_MARGIN } from "./chart.types";
import { useResizeObserver } from "./useResizeObserver";

type Props = { readonly spec: BarErrorSpec; readonly data: BarErrorPlotData };

export const barErrorChartRenderCountForTest = { value: 0 };

const BarErrorChartInner = ({ spec, data }: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
    useLayoutEffect(() => {
        barErrorChartRenderCountForTest.value += 1;
    });

    useEffect(() => {
        if (!dims || !containerRef.current) {
            return;
        }

        const svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) {
            return;
        }

        const margin = DEFAULT_MARGIN;
        const innerWidth = Math.max(0, dims.width - margin.left - margin.right);
        const innerHeight = Math.max(0, dims.height - margin.top - margin.bottom);
        const svg = select(svgEl);
        svg.selectAll("*").remove();
        svg
            .attr("width", dims.width)
            .attr("height", dims.height)
            .attr("viewBox", `0 0 ${dims.width} ${dims.height}`);

        const tokens = readDesignTokens();
        applyDesignTokens(svg, tokens);

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const domain = [...new Set(data.categories.map((c) => c.label))];
        const xScale = scaleBand<string>().domain(domain).range([0, innerWidth]).padding(0.25);
        const dropped: string[] = [];
        const seen = new Set<string>();
        const resolved = data.categories.filter((c) => {
            if (seen.has(c.label) || xScale(c.label) === undefined) {
                dropped.push(c.label);
                return false;
            }
            seen.add(c.label);
            return true;
        });
        if (process.env.NODE_ENV !== "production" && dropped.length > 0) {
            console.warn(`BarErrorChart: dropped categories: ${[...new Set(dropped)].join(", ")}`);
        }
        const yLo = Math.min(0, min(resolved, (c) => c.mean - c.error) ?? 0);
        const yHi = Math.max(0, max(resolved, (c) => c.mean + c.error) ?? 0);
        const ySpan = Math.max(yHi - yLo, 1e-6);
        const yScale: ScaleLinear<number, number> = scaleLinear()
            .domain([yLo - ySpan * 0.05, yHi + ySpan * 0.1])
            .range([innerHeight, 0])
            .nice();
        const baselineY = yScale(0);

        g.selectAll("rect.bar")
            .data(resolved)
            .join("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d.label) as number)
            .attr("y", (d) => Math.min(yScale(d.mean), baselineY))
            .attr("width", xScale.bandwidth())
            .attr("height", (d) => Math.abs(baselineY - yScale(d.mean)))
            .attr("fill", tokens.ink)
            .attr("opacity", 0.85);

        const errors = g.append("g").attr("class", "errors");
        const capW = Math.min(8, xScale.bandwidth() / 3);
        resolved.forEach((c) => {
            const bandX = xScale(c.label);
            if (bandX === undefined) {
                return;
            }
            const cx = bandX + xScale.bandwidth() / 2;
            const yTop = yScale(c.mean + c.error);
            const yBot = yScale(c.mean - c.error);
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

        applyAxes({ svg: svgEl, dimensions: dims, margin, innerWidth, innerHeight }, xScale, yScale, tokens);
    }, [spec, data, dims, containerRef]);

    return (
        <div ref={containerRef} style={{ width: "100%", minHeight: 240 }}>
            <svg className="rec-chart-svg" role="img" aria-label={spec.title} />
        </div>
    );
};

export const BarErrorChart = memo(BarErrorChartInner);
