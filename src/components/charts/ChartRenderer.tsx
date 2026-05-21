"use client";

// Bundle delta from D3: ~13 kB gzipped (esbuild minify of d3-selection/scale/array/axis only; measured 2026-05-20, Next 16.2.6).
// Budget: 35 kB. d3-shape is installed for LOUPE-12+ but not imported yet. If this comment goes stale, audit imports.

import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";

import { BarErrorChart } from "./d3/BarErrorChart";
import { PlaceholderRenderer } from "./PlaceholderRenderer";
import { PublicationKM } from "./PublicationKM";

type Props = {
    readonly spec: ChartSpec;
    readonly plotData: PlotData;
};

export const ChartRenderer = ({ spec, plotData }: Props): JSX.Element => {
    switch (spec.kind) {
        case "barError":
            if (plotData.kind !== "barError") {
                return <PlaceholderRenderer kind={spec.kind} />;
            }

            return <BarErrorChart spec={spec} data={plotData} />;
        case "km":
            return <PublicationKM animated />;
        case "box":
        case "xy":
            return <PlaceholderRenderer kind={spec.kind} />;
        default: {
            const _exhaustive: never = spec;
            return _exhaustive;
        }
    }
};
