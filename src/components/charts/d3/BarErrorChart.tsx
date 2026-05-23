"use client";

import { max, min } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import { useEffect } from "react";

import { computeErrorBar } from "@/lib/chartSpec/aggregators/errorBars";
import type { ErrorBarType, GroupStats } from "@/lib/chartSpec/aggregators/barError.types";
import type { BarErrorSpec } from "@/lib/chartSpec/types";

import { applyAxes } from "./applyAxes";
import { applyDesignTokens, readDesignTokens } from "./applyDesignTokens";
import type { Margin } from "./chart.types";
import { DEFAULT_MARGIN } from "./chart.types";
import { useResizeObserver } from "./useResizeObserver";

// File budget exception: <140 lines (vs typical <120). The two-pass draw
// cycle adds ~10 lines that are structurally required. See in-line comment
// at the second-pass site.

type Props = {
    readonly spec: BarErrorSpec;
    readonly groups: ReadonlyArray<GroupStats>;
    readonly errorType: ErrorBarType;
};

export const BarErrorChart = ({ spec, groups, errorType }: Props): JSX.Element => {
    const [containerRef, dims] = useResizeObserver<HTMLDivElement>();

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

        const draw = (margin: Margin): number => {
            const innerWidth = Math.max(0, dims.width - margin.left - margin.right);
            const innerHeight = Math.max(0, dims.height - margin.top - margin.bottom);
            svg.selectAll("*").remove();

            const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
            const xScale = scaleBand<string>()
                .domain(groups.map((c) => c.label))
                .range([0, innerWidth])
                .padding(0.25);
            const yLo = Math.min(
                0,
                min(groups, (c) => c.mean - computeErrorBar(c, errorType)) ?? 0,
            );
            const yHi = Math.max(
                0,
                max(groups, (c) => c.mean + computeErrorBar(c, errorType)) ?? 0,
            );
            const ySpan = Math.max(yHi - yLo, 1e-6);
            const yScale: ScaleLinear<number, number> = scaleLinear()
                .domain([yLo - ySpan * 0.05, yHi + ySpan * 0.1])
                .range([innerHeight, 0])
                .nice();
            const baselineY = yScale(0);

            g.selectAll("rect.bar")
                .data(groups)
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
            groups.forEach((c) => {
                const errorMag = computeErrorBar(c, errorType);
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

            return applyAxes(
                { svg: svgEl, dimensions: dims, margin, innerWidth, innerHeight },
                xScale,
                yScale,
                tokens,
            ).extraBottomPx;
        };

        const extraBottom = draw(DEFAULT_MARGIN);
        if (extraBottom > 0) {
            // Two-pass draw is intentional. Label-rotation detection in applyAxes requires
            // measured getBBox widths from a real DOM render. We accept one extra draw on
            // resize/effect-runs (microseconds at typical group counts) in exchange for
            // rotation-correctness without a separate measurement pass. Do NOT refactor to
            // a single draw without first solving offline label measurement.
            draw({ ...DEFAULT_MARGIN, bottom: DEFAULT_MARGIN.bottom + extraBottom });
        }
    }, [spec, groups, errorType, dims]);

    return (
        <div ref={containerRef} style={{ width: "100%", minHeight: 240 }}>
            <svg className="rec-chart-svg" role="img" aria-label={spec.title} />
        </div>
    );
};
