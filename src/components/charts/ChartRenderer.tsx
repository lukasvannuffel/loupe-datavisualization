"use client";

// Bundle delta from D3: ~13 kB gzipped (esbuild minify of d3-selection/scale/array/axis only; measured 2026-05-20, Next 16.2.6).
// Budget: 35 kB. d3-shape used by KaplanMeierChart (LOUPE-12). If this comment goes stale, audit imports.

import type { ChartSpec } from "@/lib/chartSpec/types";

import { PlaceholderRenderer } from "./PlaceholderRenderer";
import { PublicationKM } from "./PublicationKM";

type Props = {
    readonly spec: ChartSpec;
};

export const ChartRenderer = ({ spec }: Props): JSX.Element => {
    switch (spec.kind) {
        case "barError":
            return <PlaceholderRenderer kind={spec.kind} />;
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
