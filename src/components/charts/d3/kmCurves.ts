import { area, curveStepAfter, line } from "d3-shape";
import type { ScaleLinear } from "d3-scale";
import type { Selection } from "d3-selection";

import type { KMGroup } from "@/lib/chartSpec/aggregators/kaplanMeier.types";

import { DASH_BY_INDEX } from "./lineStyles";
const CENSOR_TICK_HALF = 4;

const drawPoints = (group: KMGroup): KMGroup["points"] => {
    const first = group.points[0];
    if (first === undefined || first.t === 0) {
        return group.points;
    }

    return [
        {
            censored: false,
            ciLower: 1,
            ciUpper: 1,
            nAtRisk: group.nTotal,
            survival: 1,
            t: 0,
        },
        ...group.points,
    ];
};

export const drawKMCurve = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    group: KMGroup,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    styleIndex: 0 | 1 | 2 | 3,
    color: string,
): void => {
    const points = drawPoints(group);
    const dash = DASH_BY_INDEX[styleIndex];

    g.append("path")
        .attr("class", "km-ci")
        .attr("d", area<KMGroup["points"][number]>()
            .x((p) => xScale(p.t))
            .y0((p) => yScale(p.ciLower))
            .y1((p) => yScale(p.ciUpper))
            .defined((p) => Number.isFinite(p.ciLower) && Number.isFinite(p.ciUpper))
            .curve(curveStepAfter)(points))
        .attr("fill", color)
        .attr("opacity", 0.12)
        .attr("stroke", "none");

    g.append("path")
        .attr("class", "km-curve")
        .attr("d", line<KMGroup["points"][number]>()
            .x((p) => xScale(p.t))
            .y((p) => yScale(p.survival))
            .curve(curveStepAfter)(points))
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", dash.length > 0 ? dash : null);

    /**
     * Censoring ticks always render as SOLID short hash marks, regardless of the
     * group's curve dasharray. The dash pattern on the curve encodes group identity
     * (LOUPE-12 monochrome+line-style system); the tick is a discrete event marker
     * with different semantics — dashed ticks render as 1–2 visible pixels at this
     * scale and fail the "visible but not dominant" acceptance criterion.
     */
    for (const point of group.points) {
        if (!point.censored) {
            continue;
        }
        const x = xScale(point.t);
        const y = yScale(point.survival);
        g.append("line")
            .attr("class", "km-censor")
            .attr("data-role", "censor-tick")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", y - CENSOR_TICK_HALF)
            .attr("y2", y + CENSOR_TICK_HALF)
            .attr("stroke", color)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "none")
            .attr("stroke-linecap", "butt");
    }
};

