import { area, curveMonotoneX, line } from "d3-shape";
import type { ScaleLinear } from "d3-scale";
import type { Selection } from "d3-selection";

import type {
    LongitudinalData,
    RegressionResult,
    XYGroup,
    XYPlotData,
} from "@/lib/chartSpec/aggregators/xyPlot.types";
import type { PaletteName } from "@/lib/chartSpec/types";

import { DASH_BY_INDEX } from "./lineStyles";
import { MARKER_BY_INDEX } from "./markerShapes";
import { colorByIndex } from "./palettes";

const INK = "var(--ink)";

export const longitudinalAsXY = (group: LongitudinalData["groups"][number]): XYGroup => ({
    label: group.label,
    points: group.points.map((p) => ({ x: p.visit, y: p.mean })),
});

export const drawXYLine = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    group: XYGroup,
    styleIndex: 0 | 1 | 2 | 3,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    color: string,
): void => {
    const dash = DASH_BY_INDEX[styleIndex];
    g.append("path")
        .attr("data-role", "xy-line")
        .attr(
            "d",
            line<XYGroup["points"][number]>()
                .x((p) => xScale(p.x))
                .y((p) => yScale(p.y))
                .curve(curveMonotoneX)([...group.points]),
        )
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", dash.length > 0 ? dash : null);
};

export const drawXYMarkers = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    group: XYGroup,
    styleIndex: 0 | 1 | 2 | 3,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    color: string,
): void => {
    const markerPath = MARKER_BY_INDEX[styleIndex] ?? MARKER_BY_INDEX[0];
    for (const point of group.points) {
        g.append("path")
            .attr("data-role", "xy-marker")
            .attr("d", markerPath)
            .attr("transform", `translate(${xScale(point.x)},${yScale(point.y)})`)
            .attr("fill", color)
            .attr("stroke", "none");
    }
};

export const drawRegressionLine = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    regression: RegressionResult,
    group: XYGroup,
    styleIndex: 0 | 1 | 2 | 3,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    color: string,
): void => {
    const xs = group.points.map((p) => p.x);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = regression.slope * x0 + regression.intercept;
    const y1 = regression.slope * x1 + regression.intercept;
    const dash = DASH_BY_INDEX[styleIndex];

    g.append("line")
        .attr("data-role", "xy-regression")
        .attr("data-observed-x-min", String(x0))
        .attr("data-observed-x-max", String(x1))
        .attr("x1", xScale(x0))
        .attr("y1", yScale(y0))
        .attr("x2", xScale(x1))
        .attr("y2", yScale(y1))
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", dash.length > 0 ? dash : null)
        .attr("opacity", 0.6);

    g.append("text")
        .attr("data-role", "xy-regression-label")
        .attr("x", xScale(x1) - 4)
        .attr("y", yScale(y1) - 4)
        .attr("text-anchor", "end")
        .attr("fill", INK)
        .attr("font-size", 11)
        .attr("opacity", 0.8)
        .text(`r² = ${regression.r2.toFixed(2)}`);
};

export const drawXYErrorBand = (
    g: Selection<SVGGElement, unknown, null, undefined>,
    group: LongitudinalData["groups"][number],
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    color: string,
): void => {
    g.append("path")
        .attr("data-role", "xy-band")
        .attr(
            "d",
            area<LongitudinalData["groups"][number]["points"][number]>()
                .x((p) => xScale(p.visit))
                .y0((p) => yScale(p.mean - p.sem))
                .y1((p) => yScale(p.mean + p.sem))
                .defined((p) => Number.isFinite(p.sem) && p.sem > 0)
                .curve(curveMonotoneX)([...group.points]),
        )
        .attr("fill", color)
        .attr("opacity", 0.12)
        .attr("stroke", "none");
};

type XYChartRenderOptions = {
    readonly mode: "line" | "scatter" | "both";
    readonly showRegression: boolean;
    readonly showErrorBands: boolean;
    readonly palette: PaletteName | undefined;
    readonly xScale: ScaleLinear<number, number>;
    readonly yScale: ScaleLinear<number, number>;
};

export const renderXYChartGroups = (
    data: XYPlotData | LongitudinalData,
    plotG: Selection<SVGGElement, unknown, null, undefined>,
    options: XYChartRenderOptions,
): void => {
    const { mode, showRegression, showErrorBands, palette, xScale, yScale } = options;
    const groupCount = data.groups.length;

    if (data.kind === "longitudinal") {
        for (const [index, group] of data.groups.entries()) {
            const styleIndex = Math.min(index, 3) as 0 | 1 | 2 | 3;
            const color = colorByIndex(palette, styleIndex, groupCount);
            const groupG = plotG
                .append("g")
                .attr("class", `xy-group-${group.label}`)
                .attr("data-group-index", String(index));
            const xyGroup = longitudinalAsXY(group);

            if (showErrorBands && (mode === "line" || mode === "both")) {
                drawXYErrorBand(groupG, group, xScale, yScale, color);
            }
            if (mode === "line" || mode === "both") {
                drawXYLine(groupG, xyGroup, styleIndex, xScale, yScale, color);
            }
            if (mode === "scatter" || mode === "both") {
                drawXYMarkers(groupG, xyGroup, styleIndex, xScale, yScale, color);
            }
        }

        return;
    }

    for (const [index, group] of data.groups.entries()) {
        const styleIndex = Math.min(index, 3) as 0 | 1 | 2 | 3;
        const color = colorByIndex(palette, styleIndex, groupCount);
        const groupG = plotG
            .append("g")
            .attr("class", `xy-group-${group.label}`)
            .attr("data-group-index", String(index));

        if (mode === "line" || mode === "both") {
            drawXYLine(groupG, group, styleIndex, xScale, yScale, color);
        }
        if (mode === "scatter" || mode === "both") {
            drawXYMarkers(groupG, group, styleIndex, xScale, yScale, color);
        }
        if (showRegression) {
            const fit = data.regressions.find((r) => r.label === group.label);
            if (fit !== undefined) {
                drawRegressionLine(groupG, fit, group, styleIndex, xScale, yScale, color);
            }
        }
    }
};
