import type { Dimensions, Margin } from "./chart.types";

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
    const xLabelY = margin.top + innerHeight + extraBottomPx + 18;
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
            editHeight: 24,
            foreignX: xLabelX - Math.min(280, innerWidth) / 2,
            foreignY: xLabelY - 18,
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
