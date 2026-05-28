import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";

const countLongitudinalRows = (plotData: Extract<PlotData, { kind: "longitudinal" }>): number =>
    plotData.groups.reduce(
        (sum, group) => sum + Math.max(...group.points.map((point) => point.n), 0),
        0,
    );

export const sampleString = (spec: ChartSpec, plotData: PlotData): string => {
    switch (spec.kind) {
        case "barError": {
            const total = plotData.kind === "barError" ? plotData.groups.reduce((sum, g) => sum + g.n, 0) : 0;

            return `n = ${total}`;
        }
        case "km": {
            const total = plotData.kind === "km" ? plotData.groups.reduce((sum, g) => sum + g.nTotal, 0) : 0;
            const censored =
                plotData.kind === "km"
                    ? plotData.groups.reduce(
                          (sum, group) =>
                              sum + group.points.reduce((groupSum, point) => groupSum + (point.censored ? 1 : 0), 0),
                          0,
                      )
                    : 0;

            return `n = ${total} · censored = ${censored}`;
        }
        case "box": {
            const total =
                plotData.kind === "box"
                    ? plotData.groups.reduce((sum, group) => sum + group.n, 0)
                    : 0;
            const groups = plotData.kind === "box" ? plotData.groups.length : 0;

            return `n = ${total} · groups = ${groups}`;
        }
        case "xy": {
            const total =
                plotData.kind === "xy"
                    ? plotData.groups.reduce((sum, group) => sum + group.points.length, 0)
                    : plotData.kind === "longitudinal"
                      ? countLongitudinalRows(plotData)
                      : 0;
            const groups =
                plotData.kind === "xy" || plotData.kind === "longitudinal"
                    ? plotData.groups.length
                    : 0;

            return `n = ${total} · groups = ${groups}`;
        }
    }
};
