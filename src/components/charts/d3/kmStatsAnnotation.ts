import type { Selection } from "d3-selection";

import type { DesignTokens } from "./applyDesignTokens";

export const KM_STAT_PLACEHOLDER_LINES = [
    "HR 0.74 (95% CI 0.61–0.89)",
    "log-rank p < 0.001",
] as const;

const LINE_HEIGHT_PX = 14;
const TOP_OFFSET_PX = 12;
const RIGHT_OFFSET_PX = 4;

export const resolveKmStatLines = (statLabels?: readonly string[]): readonly string[] => {
    if (statLabels !== undefined && statLabels.length > 0) {
        return statLabels.slice(0, 2);
    }

    return KM_STAT_PLACEHOLDER_LINES;
};

export const drawKmStatAnnotation = (
    plotG: Selection<SVGGElement, unknown, null, undefined>,
    innerWidth: number,
    tokens: DesignTokens,
    lines: readonly string[],
): void => {
    const annotationG = plotG
        .append("g")
        .attr("class", "km-stats")
        .attr("data-role", "km-stats");

    lines.forEach((line, index) => {
        annotationG
            .append("text")
            .attr("data-role", "km-stat-line")
            .attr("x", innerWidth - RIGHT_OFFSET_PX)
            .attr("y", TOP_OFFSET_PX + index * LINE_HEIGHT_PX)
            .attr("text-anchor", "end")
            .attr("fill", tokens.muted)
            .attr("font-size", "10.5px")
            .text(line);
    });
};
