import type { BarErrorAggregation } from "@/lib/chartSpec/aggregators/barError.types";
import type { ChartSpec } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

export type CanCustomizeInput = {
    readonly barErrorAggregation: BarErrorAggregation | undefined;
    readonly chartKind: ChartSpec["kind"];
    readonly chartSpec: ChartSpec | null;
    readonly mapping: Mapping;
    readonly phase: number;
};

export const canCustomizeRecommendation = ({
    barErrorAggregation,
    chartKind,
    chartSpec,
    mapping,
    phase,
}: CanCustomizeInput): boolean => {
    if (chartSpec === null || phase < 2) {
        return false;
    }

    // NOTE: canCustomize checks mapping role presence only. For km/box/xy,
    // SpecChartPanel may still show ChartError if the aggregator throws
    // (e.g. n<3 for xy regression). Asymmetric vs barError (groups.length > 0).
    // Accepted: aggregator stability is a separate concern. See LOUPE review 2026-06-01.

    if (chartKind === "barError") {
        return (barErrorAggregation?.groups.length ?? 0) > 0;
    }

    if (chartKind === "km") {
        return mapping.time !== undefined && mapping.event !== undefined;
    }

    if (chartKind === "box") {
        return mapping.outcome !== undefined;
    }

    if (chartKind === "xy") {
        return mapping.x !== undefined && mapping.y !== undefined;
    }

    return false;
};
