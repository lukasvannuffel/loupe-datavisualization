// TODO LOUPE-11: This file is temporary scaffolding so the renderer can be exercised
// before real aggregation lands. Real implementation will compute PlotData from
// the actual PrivateRows using the mapping + spec. DELETE this file when LOUPE-11
// ships and replace all call sites with the real aggregator.

import type { ColumnInference } from "@/lib/parser/inference.types";

import type { ChartSpec, PlotData } from "./types";

export const mockPlotDataFromInferences = (
    inferences: ReadonlyArray<ColumnInference>,
    kind: ChartSpec["kind"],
): PlotData => {
    switch (kind) {
        case "barError": {
            const groupCol = inferences.find((i) => i.primaryType === "categorical");
            const groups = groupCol?.sampleValues.slice(0, 4) ?? ["A", "B", "C"];

            return {
                kind: "barError",
                categories: groups.map((label, i) => ({
                    label,
                    mean: 10 + i * 3,
                    error: 1.2 + (i % 2) * 0.5,
                    n: 20 + i * 5,
                })),
            };
        }
        case "km":
            return {
                kind: "km",
                groups: [
                    {
                        label: "All",
                        points: [
                            { time: 0, survival: 1, atRisk: 100, censored: 0 },
                            { time: 12, survival: 0.85, atRisk: 85, censored: 5 },
                        ],
                    },
                ],
            };
        case "box":
            return {
                kind: "box",
                groups: [
                    {
                        label: "A",
                        min: 1,
                        q1: 2,
                        median: 3,
                        q3: 4,
                        max: 5,
                        outliers: [],
                        n: 20,
                    },
                ],
            };
        case "xy":
            return {
                kind: "xy",
                series: [
                    {
                        label: "Series",
                        points: [
                            { x: 1, y: 2 },
                            { x: 2, y: 4 },
                            { x: 3, y: 6 },
                        ],
                    },
                ],
            };
    }
};
