import { axisBottom, axisLeft } from "d3-axis";
import type { ScaleBand, ScaleLinear } from "d3-scale";
import { select } from "d3-selection";

import type { DesignTokens } from "./applyDesignTokens";
import type { ChartDrawContext } from "./chart.types";

type LinearScale = ScaleLinear<number, number>;
type BandScale = ScaleBand<string>;
type AxisScale = LinearScale | BandScale;

const MAX_LABEL_CHARS = 12;
const BAND_WIDTH_ROTATE_THRESHOLD = 60;
const ROTATION_DEG = -35;
const truncateLabel = (label: string): string =>
    label.length <= MAX_LABEL_CHARS ? label : `${label.slice(0, MAX_LABEL_CHARS - 1)}…`;
const isBandScale = (scale: AxisScale): scale is BandScale => "bandwidth" in scale;

export const axisTickCountForWidth = (width: number): number => (width < 480 ? 4 : 6);

export const applyAxes = (
    ctx: ChartDrawContext,
    xScale: AxisScale,
    yScale: AxisScale,
    tokens: DesignTokens,
): void => {
    const tickCount = axisTickCountForWidth(ctx.dimensions.width);
    const svgSel = select(ctx.svg);
    svgSel.selectAll("g.x-axis, g.y-axis").remove();
    const xAxisG = svgSel
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(${ctx.margin.left},${ctx.margin.top + ctx.innerHeight})`);
    const yAxisG = svgSel
        .append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${ctx.margin.left},${ctx.margin.top})`);

    if (isBandScale(xScale)) {
        xAxisG.call(axisBottom(xScale).tickSizeOuter(0).tickPadding(6));
        xAxisG.selectAll("line, path").attr("stroke", tokens.hairline);
        const n = xScale.domain().length;
        const tickTexts = xAxisG.selectAll<SVGTextElement, string>("text").attr("fill", tokens.ink);
        tickTexts.each(function (d: string) {
            const el = select(this);
            el.text(truncateLabel(d));
            el.append("title").text(d);
        });
        if (n > 0 && ctx.innerWidth / n < BAND_WIDTH_ROTATE_THRESHOLD) {
            tickTexts
                .attr("transform", `rotate(${ROTATION_DEG})`)
                .attr("text-anchor", "end")
                .attr("dx", "-0.5em")
                .attr("dy", "0.5em");
        }
    }
    else {
        xAxisG.call(axisBottom(xScale).ticks(tickCount).tickSizeOuter(0).tickPadding(6));
        xAxisG.selectAll("line, path").attr("stroke", tokens.hairline);
        xAxisG.selectAll("text").attr("fill", tokens.ink);
    }
    if (isBandScale(yScale)) {
        yAxisG.call(axisLeft(yScale).tickSizeOuter(0).tickPadding(6));
    }
    else {
        yAxisG.call(axisLeft(yScale).ticks(tickCount).tickSizeOuter(0).tickPadding(6));
    }
    yAxisG.selectAll("line, path").attr("stroke", tokens.hairline);
    yAxisG.selectAll("text").attr("fill", tokens.ink);
};
