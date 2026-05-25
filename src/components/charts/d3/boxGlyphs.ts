import type { ScaleLinear } from "d3-scale";
import type { Selection } from "d3-selection";
import type { BoxStats, StripStats } from "@/lib/chartSpec/aggregators/boxPlot.types";
import type { DesignTokens } from "./applyDesignTokens";

type BoxDrawOptions = {
    readonly notched: boolean;
    readonly showMeanMarker: boolean;
    readonly showOutliers: boolean;
};

const line = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    role: string,
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    ink: string,
    width = 0.75,
): void => {
    g.append("line").attr("data-role", role).attr("x1", x1).attr("x2", x2).attr("y1", y1).attr("y2", y2)
        .attr("stroke", ink).attr("stroke-width", width);
};

export const drawBoxGlyph = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    stats: BoxStats,
    xCenter: number,
    boxWidth: number,
    yScale: ScaleLinear<number, number>,
    options: BoxDrawOptions,
    tokens: DesignTokens,
    groupFillColor: string,
    useEditorialFill: boolean,
): void => {
    const left = xCenter - boxWidth / 2;
    const right = xCenter + boxWidth / 2;
    const yQ1 = yScale(stats.q1);
    const yQ3 = yScale(stats.q3);
    const yMed = yScale(stats.median);
    const cap = boxWidth * 0.25;
    g.append("rect")
        .attr("data-role", "box-rect")
        .attr("x", left)
        .attr("y", Math.min(yQ1, yQ3))
        .attr("width", boxWidth)
        .attr("height", Math.max(Math.abs(yQ1 - yQ3), 0.5))
        .attr("fill", useEditorialFill ? tokens.paper : groupFillColor)
        .attr("fill-opacity", useEditorialFill ? 1 : 0.2)
        .attr("stroke", tokens.ink)
        .attr("stroke-width", 0.75);
    if (options.notched) {
        const inset = boxWidth * 0.15;
        g.append("path").attr("data-role", "box-notch").attr("d",
            `M ${left} ${yQ3} L ${left} ${yScale(stats.notchUpper)} L ${left + inset} ${yMed} L ${left} ${yScale(stats.notchLower)} L ${left} ${yQ1} M ${right} ${yQ3} L ${right} ${yScale(stats.notchUpper)} L ${right - inset} ${yMed} L ${right} ${yScale(stats.notchLower)} L ${right} ${yQ1}`,
        ).attr("fill", "none").attr("stroke", tokens.ink).attr("stroke-width", 0.75);
    }
    line(g, "box-median", left, right, yMed, yMed, tokens.ink, 1.25);
    for (const [extent, edge] of [[stats.max, stats.q3], [stats.min, stats.q1]] as const) {
        const yExt = yScale(extent);
        line(g, "box-whisker", xCenter, xCenter, yExt, yScale(edge), tokens.ink);
        line(g, "box-whisker-cap", xCenter - cap, xCenter + cap, yExt, yExt, tokens.ink);
    }
    if (options.showOutliers) {
        stats.outliers.forEach((outlier, index) => {
            const prior = stats.outliers.slice(0, index).filter((value) => value === outlier).length;
            const jitter = prior === 0 ? 0 : (prior % 2 === 0 ? -1 : 1) * boxWidth * 0.1 * Math.ceil(prior / 2);
            g.append("circle").attr("data-role", "box-outlier").attr("cx", xCenter + jitter).attr("cy", yScale(outlier))
                .attr("r", 2).attr("fill", tokens.paper).attr("stroke", tokens.ink).attr("stroke-width", 0.75);
        });
    }
    if (options.showMeanMarker) {
        g.append("circle").attr("data-role", "box-mean").attr("cx", xCenter).attr("cy", yScale(stats.mean))
            .attr("r", 2.5).attr("fill", tokens.ink).attr("stroke", "none");
    }
};

export const drawStripGlyph = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    stats: StripStats,
    xCenter: number,
    yScale: ScaleLinear<number, number>,
    labelY: number,
    tokens: DesignTokens,
): void => {
    stats.values.forEach((value) => {
        g.append("circle").attr("data-role", "strip-point").attr("cx", xCenter).attr("cy", yScale(value))
            .attr("r", 2).attr("fill", tokens.paper).attr("stroke", tokens.ink).attr("stroke-width", 0.75);
    });
    g.append("text").attr("data-role", "strip-n-label").attr("x", xCenter).attr("y", labelY)
        .attr("text-anchor", "middle").attr("fill", tokens.muted).attr("font-size", "9px").text(`n=${stats.n}`);
};
