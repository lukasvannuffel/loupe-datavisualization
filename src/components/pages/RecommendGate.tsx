"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/app/providers";
import { createDefaultChartSpec } from "@/lib/chartSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";

import { Recommendation } from "./Recommendation";

export const RecommendGate = (): JSX.Element | null => {
    const router = useRouter();
    const { chartKind, chartSpec, dataset, hydrated, lastRecommendationFromCache, receipt } =
        useAppState();
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
        setResolvedSpec(chartSpec ?? createDefaultChartSpec(chartKind));
    }, [chartKind, chartSpec]);

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
