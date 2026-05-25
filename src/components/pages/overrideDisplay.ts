import { displayNameForKind } from "@/components/charts/chartDisplayNames";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

export type OverrideDisplayState = {
    readonly isDisplayOverridden: boolean;
    readonly originalKind: ChartSpec["kind"] | null;
    readonly title: string;
};

/**
 * Override history may exist, but if the user is back on the AI's original kind we show
 * the normal AI presentation (no composite title, badge, historical rationale, or textarea).
 */
export const getOverrideDisplayState = (
    receipt: Receipt,
    chartKind: ChartSpec["kind"],
): OverrideDisplayState => {
    if (receipt.overrides.length === 0) {
        return {
            isDisplayOverridden: false,
            originalKind: null,
            title: receipt.recommendation.chartName,
        };
    }

    const originalKind = receipt.overrides[0].from;
    const isDisplayOverridden = chartKind !== originalKind;

    if (!isDisplayOverridden) {
        return {
            isDisplayOverridden: false,
            originalKind,
            title: receipt.recommendation.chartName,
        };
    }

    const currentKindName = displayNameForKind(chartKind);
    const originalKindName = displayNameForKind(originalKind);

    return {
        isDisplayOverridden: true,
        originalKind,
        title: `${currentKindName} · overridden from ${originalKindName}`,
    };
};
