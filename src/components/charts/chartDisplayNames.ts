import type { ChartSpec } from "@/lib/chartSpec/types";

const MVP_DISPLAY_NAMES: Record<ChartSpec["kind"], string> = {
    barError: "Bar chart with error bars",
    box: "Box plot",
    km: "Kaplan-Meier",
    xy: "Scatter / line plot",
};

export const displayNameForKind = (kind: ChartSpec["kind"]): string => MVP_DISPLAY_NAMES[kind];
