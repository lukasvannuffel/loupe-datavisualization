import type { Dimensions, Margin } from "./chart.types";

/** D3 axisBottom tick band below the axis line (tickPadding + tick text). */
export const LINEAR_X_TICK_OVERFLOW_PX = 28;

export const X_AXIS_LABEL_GAP_PX = 10;

export const X_AXIS_LABEL_EDIT_HEIGHT = 24;

/** SVG y for the x-axis title, below tick numbers (linear or rotated). */
export const xAxisLabelY = (
    margin: Margin,
    innerHeight: number,
    extraBottomPx: number,
): number =>
    margin.top +
    innerHeight +
    extraBottomPx +
    (extraBottomPx > 0
        ? X_AXIS_LABEL_GAP_PX
        : LINEAR_X_TICK_OVERFLOW_PX + X_AXIS_LABEL_GAP_PX);

export type LabelAnchor = "start" | "middle" | "end";

export type ChartLabelSlot = {
    readonly x: number;
    readonly y: number;
    readonly textAnchor: LabelAnchor;
    readonly rotate?: number;
    readonly editWidth: number;
    readonly editHeight: number;
    readonly foreignX: number;
    readonly foreignY: number;
};

export type ChartLabelLayout = {
    readonly title: ChartLabelSlot;
    readonly x: ChartLabelSlot;
    readonly y: ChartLabelSlot;
};

export const chartLabelLayout = (
    dimensions: Dimensions,
    margin: Margin,
    innerWidth: number,
    innerHeight: number,
    extraBottomPx: number,
): ChartLabelLayout => {
    const titleX = dimensions.width / 2;
    const titleY = 20;
    const xLabelX = margin.left + innerWidth / 2;
    const xLabelY = xAxisLabelY(margin, innerHeight, extraBottomPx);
    const yLabelX = 16;
    const yLabelY = margin.top + innerHeight / 2;

    return {
        title: {
            x: titleX,
            y: titleY,
            textAnchor: "middle",
            editWidth: Math.min(320, dimensions.width - 24),
            editHeight: 28,
            foreignX: titleX - Math.min(320, dimensions.width - 24) / 2,
            foreignY: titleY - 20,
        },
        x: {
            x: xLabelX,
            y: xLabelY,
            textAnchor: "middle",
            editWidth: Math.min(280, innerWidth),
            editHeight: X_AXIS_LABEL_EDIT_HEIGHT,
            foreignX: xLabelX - Math.min(280, innerWidth) / 2,
            foreignY: xLabelY - X_AXIS_LABEL_EDIT_HEIGHT,
        },
        y: {
            x: yLabelX,
            y: yLabelY,
            textAnchor: "middle",
            rotate: -90,
            editWidth: Math.min(200, innerHeight),
            editHeight: 24,
            foreignX: 4,
            foreignY: yLabelY - Math.min(200, innerHeight) / 2,
        },
    };
};
