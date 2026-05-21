"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/app/providers";
import { createDefaultChartSpec, mockPlotDataFromInferences } from "@/lib/chartSpec";
import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";

import { Recommendation } from "./Recommendation";

export const RecommendGate = (): JSX.Element | null => {
    const router = useRouter();
    const { chartKind, chartSpec, dataset, hydrated, lastRecommendationFromCache, receipt } =
        useAppState();
    const [resolvedSpec, setResolvedSpec] = useState<ChartSpec | null>(null);
    const [plotData, setPlotData] = useState<PlotData | null>(null);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (!receipt || !chartKind) {
            router.replace("/upload/map");
        }
    }, [chartKind, hydrated, receipt, router]);

    useEffect(() => {
        if (!chartKind) {
            setResolvedSpec(null);

            return;
        }
        setResolvedSpec(chartSpec ?? createDefaultChartSpec(chartKind));
    }, [chartKind, chartSpec]);

    useEffect(() => {
        if (!dataset || !chartKind) {
            setPlotData(null);

            return;
        }
        // TODO LOUPE-11: replace mockPlotDataFromInferences with real aggregation
        setPlotData(mockPlotDataFromInferences(dataset, chartKind));
    }, [chartKind, dataset]);

    if (!hydrated || !receipt || !chartKind || !resolvedSpec || !plotData) {
        return null;
    }

    return (
        <Recommendation
            chartKind={chartKind}
            fromCache={lastRecommendationFromCache}
            plotData={plotData}
            receipt={receipt}
            spec={resolvedSpec}
        />
    );
};
