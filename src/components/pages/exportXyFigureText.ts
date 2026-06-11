import type { XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";

export const buildXyMetaLine = (plotData: XYPlotData): string => {
    const totalPoints = plotData.groups.reduce((sum, group) => sum + group.points.length, 0);
    const groupCount = plotData.groups.length;

    return groupCount > 1 ? `n = ${totalPoints} · groups = ${groupCount}` : `n = ${totalPoints}`;
};

export const buildXyCaption = (plotData: XYPlotData): string => {
    if (plotData.regressions.length === 0 || plotData.regressionSkipped) {
        return "Scatter plot. No regression computed.";
    }

    if (plotData.regressions.length === 1) {
        const reg = plotData.regressions[0]!;

        return `Linear regression: r² = ${reg.r2.toFixed(2)}.`;
    }

    const parts = plotData.regressions
        .map((regression) => `${regression.label}: r² = ${regression.r2.toFixed(2)}`)
        .join(", ");

    return `Per-group linear regression. ${parts}.`;
};
