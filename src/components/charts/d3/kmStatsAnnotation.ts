import type { Selection } from "d3-selection";

import type { LogRankResult } from "@/lib/chartSpec/aggregators/kmLogRank";

import type { DesignTokens } from "./applyDesignTokens";

const LINE_HEIGHT_PX = 14;
const TOP_OFFSET_PX = 12;
const RIGHT_OFFSET_PX = 4;

const formatPValue = (pValue: number): string =>
    pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`;

export const resolveKmStatLines = (logRank?: LogRankResult | null): readonly string[] => {
    if (logRank === null || logRank === undefined) {
        return [];
    }

    return [`log-rank ${formatPValue(logRank.pValue)}`];
};

export const drawKmStatAnnotation = (
    plotG: Selection<SVGGElement, unknown, null, undefined>,
    innerWidth: number,
    tokens: DesignTokens,
    lines: readonly string[],
): void => {
    if (lines.length === 0) {
        return;
    }

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
