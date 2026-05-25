"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/app/providers";
import { brandRows } from "@/lib/parser/types";
import {
    applyXYLongitudinalRouting,
    createDefaultChartSpec,
} from "@/lib/chartSpec/factory";
import { attachCustomizations } from "@/lib/chartSpec/labels/buildCustomizations";
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

        const rows = dataset?.rows ?? brandRows([]);
        const baseSpec = chartSpec ?? createDefaultChartSpec(chartKind, undefined, {
            inferences: dataset?.inferences ?? [],
            mapping,
            rows,
        });

        if (chartKind === "xy" && baseSpec.kind === "xy" && dataset !== null) {
            const routed = applyXYLongitudinalRouting(baseSpec, {
                inferences: dataset.inferences,
                mapping,
                rows: dataset.rows,
            });
            if (routed.mapping.id !== mapping.id) {
                setMapping(routed.mapping);
            }
            setResolvedSpec(attachCustomizations(routed.spec, mapping));

            return;
        }

        setResolvedSpec(attachCustomizations(baseSpec, mapping));
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
