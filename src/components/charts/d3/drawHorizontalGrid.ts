import type { ScaleLinear } from "d3-scale";
import type { Selection } from "d3-selection";

import type { DesignTokens } from "./applyDesignTokens";

export const drawHorizontalGrid = (
    plotG: Selection<SVGGElement, unknown, null, undefined>,
    yScale: ScaleLinear<number, number>,
    innerWidth: number,
    tokens: DesignTokens,
    tickCount = 5,
): void => {
    plotG
        .append("g")
        .attr("class", "chart-grid")
        .selectAll("line")
        .data(yScale.ticks(tickCount))
        .join("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", (t) => yScale(t))
        .attr("y2", (t) => yScale(t))
        .attr("stroke", tokens.hairline)
        .attr("stroke-width", 0.6);
};
