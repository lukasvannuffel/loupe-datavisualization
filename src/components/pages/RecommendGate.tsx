"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/app/providers";
import { updateCustomizationPalette } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveWizardChartSpec } from "@/lib/chartSpec/resolveWizardChartSpec";
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
        setChartSpec,
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

        if (chartSpec !== null && chartSpec.kind === chartKind) {
            setResolvedSpec(chartSpec);

            return;
        }

        const previousPalette = chartSpec?.customizations?.palette;

        const { spec, mapping: nextMapping } = resolveWizardChartSpec({
            chartKind,
            chartSpec: null,
            dataset,
            mapping,
        });

        const nextSpec =
            previousPalette !== undefined
                ? updateCustomizationPalette(spec, previousPalette)
                : spec;

        if (nextMapping.id !== mapping.id) {
            setMapping(nextMapping);
        }

        setResolvedSpec(nextSpec);
        setChartSpec(nextSpec);
    }, [chartKind, chartSpec, dataset, mapping, setChartSpec, setMapping]);

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
