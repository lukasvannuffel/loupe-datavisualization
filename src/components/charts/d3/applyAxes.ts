import { axisBottom, axisLeft } from "d3-axis";
import type { ScaleBand, ScaleLinear } from "d3-scale";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";

import type { DesignTokens } from "./applyDesignTokens";
import type { ChartDrawContext } from "./chart.types";

type LinearScale = ScaleLinear<number, number>;
type BandScale = ScaleBand<string>;
type AxisScale = LinearScale | BandScale;

/** Horizontal gap (px) between adjacent x-axis tick labels when measuring
 *  total label width for overflow detection. Approximates minimum legible
 *  whitespace between two adjacent text labels. */
const TICK_GAP_PX = 8;
const ROTATION_DEG = -35;
const ROTATION_RAD = (Math.abs(ROTATION_DEG) * Math.PI) / 180;
const ROTATION_BOTTOM_PAD = 8;

const isBandScale = (scale: AxisScale): scale is BandScale => "bandwidth" in scale;

export type ApplyAxesResult = {
    readonly extraBottomPx: number;
};

/**
 * Chooses x-axis tick count based on plot width. <480px gets 4 ticks to avoid
 * label collisions; ≥480px gets 6. Exported so consumers (like AtRiskTable)
 * can match their column count to the axis.
 */
export function axisTickCountForWidth(widthPx: number): number {
    return widthPx < 480 ? 4 : 6;
}

const projectedRotatedHeight = (width: number, height: number): number =>
    width * Math.sin(ROTATION_RAD) + height * Math.cos(ROTATION_RAD);

const applyBandXAxis = (
    xAxisG: Selection<SVGGElement, unknown, null, undefined>,
    xScale: BandScale,
    innerWidth: number,
    tokens: DesignTokens,
): number => {
    xAxisG.call(axisBottom(xScale).tickSizeOuter(0).tickPadding(6));
    xAxisG.selectAll("line, path").attr("stroke", tokens.hairline);

    const tickTexts = xAxisG.selectAll<SVGTextElement, string>("text").attr("fill", tokens.ink);
    tickTexts.each(function (d: string) {
        const el = select(this);
        el.text(d);
        el.append("title").text(d);
    });

    const widths: number[] = [];
    tickTexts.each(function () {
        widths.push(this.getBBox().width);
    });

    const n = widths.length;
    const totalWidth =
        widths.reduce((sum, w) => sum + w, 0) + (n > 1 ? TICK_GAP_PX * (n - 1) : 0);
    const shouldRotate = n > 0 && totalWidth > innerWidth;

    if (!shouldRotate) {
        return 0;
    }

    tickTexts
        .attr("transform", `rotate(${ROTATION_DEG})`)
        .attr("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em");

    let maxHeight = 0;
    tickTexts.each(function () {
        const box = this.getBBox();
        maxHeight = Math.max(maxHeight, projectedRotatedHeight(box.width, box.height));
    });

    return Math.ceil(maxHeight + ROTATION_BOTTOM_PAD);
};

export const applyAxes = (
    ctx: ChartDrawContext,
    xScale: AxisScale,
    yScale: AxisScale,
    tokens: DesignTokens,
): ApplyAxesResult => {
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

    let extraBottomPx = 0;

    if (isBandScale(xScale)) {
        extraBottomPx = applyBandXAxis(xAxisG, xScale, ctx.innerWidth, tokens);
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

    return { extraBottomPx };
};
