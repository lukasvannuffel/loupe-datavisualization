"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/app/providers";
import {
    applyXYLongitudinalRouting,
    createDefaultChartSpec,
} from "@/lib/chartSpec/factory";
import type { ChartSpec } from "@/lib/chartSpec/types";

import { Recommendation } from "./Recommendation";

export const RecommendGate = (): JSX.Element | null => {
    const router = useRouter();
    const {
        chartKind,
        chartSpec,
        dataset,
        hydrated,
        lastRecommendationFromCache,
        mapping,
        receipt,
        setMapping,
    } = useAppState();
    const [resolvedSpec, setResolvedSpec] = useState<ChartSpec | null>(null);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (!receipt || !chartKind || dataset === null) {
            router.replace("/upload/map");
        }
    }, [chartKind, dataset, hydrated, receipt, router]);

    useEffect(() => {
        if (!chartKind) {
            setResolvedSpec(null);

            return;
        }

        const baseSpec = chartSpec ?? createDefaultChartSpec(chartKind);

        if (chartKind === "xy" && baseSpec.kind === "xy" && dataset !== null) {
            const routed = applyXYLongitudinalRouting(baseSpec, {
                inferences: dataset.inferences,
                mapping,
                rows: dataset.rows,
            });
            if (routed.mapping.id !== mapping.id) {
                setMapping(routed.mapping);
            }
            setResolvedSpec(routed.spec);

            return;
        }

        setResolvedSpec(baseSpec);
    }, [chartKind, chartSpec, dataset, mapping, setMapping]);

    if (!hydrated || !receipt || !chartKind || !resolvedSpec || dataset === null) {
        return null;
    }

    return (
        <Recommendation
            chartKind={chartKind}
            dataset={dataset}
            fromCache={lastRecommendationFromCache}
            receipt={receipt}
            spec={resolvedSpec}
        />
    );
};
