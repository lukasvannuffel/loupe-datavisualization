import type { PlotData, SpecKind } from "@/lib/chartSpec/types";

import { chartKindIcon, type DashboardChartKind } from "./chartKindIcons";

const AGGREGATE_KINDS = new Set<DashboardChartKind>(["bar", "km"]);
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_HEIGHT = 320;

const toDashboardChartKind = (chartKind: SpecKind): DashboardChartKind =>
    chartKind === "barError" ? "bar" : chartKind;

const isAggregateChart = (chartKind: DashboardChartKind, plotDataKind: PlotData["kind"]): boolean =>
    AGGREGATE_KINDS.has(chartKind) || (chartKind === "xy" && plotDataKind === "longitudinal");

const rasterizeSvgToPng = async (
    svgElement: SVGSVGElement,
    width: number,
    height: number,
): Promise<string> => {
    const serializedSvg = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([serializedSvg], { type: "image/svg+xml" });
    const blobUrl = URL.createObjectURL(svgBlob);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const nextImage = new Image();
            nextImage.onload = () => resolve(nextImage);
            nextImage.onerror = () => reject(new Error("Unable to render chart thumbnail image"));
            nextImage.src = blobUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (context === null) {
            throw new Error("Unable to access canvas context");
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        return canvas.toDataURL("image/png");
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
};

export const generateThumbnail = async (
    chartKind: SpecKind,
    plotDataKind: PlotData["kind"],
    svgElement: SVGSVGElement | null,
): Promise<string> => {
    const dashboardKind = toDashboardChartKind(chartKind);
    if (!isAggregateChart(dashboardKind, plotDataKind)) {
        return chartKindIcon(dashboardKind);
    }
    if (svgElement === null) {
        return chartKindIcon(dashboardKind);
    }

    try {
        return await rasterizeSvgToPng(svgElement, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    } catch {
        return chartKindIcon(dashboardKind);
    }
};
