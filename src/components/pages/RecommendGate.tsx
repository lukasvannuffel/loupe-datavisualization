"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppState } from "@/app/providers";
import { PageSkeleton } from "@/components/primitives/PageSkeleton";
import { updateCustomizationPalette } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveWizardChartSpec } from "@/lib/chartSpec/resolveWizardChartSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";

import { Recommendation } from "./Recommendation";
import { RecommendationAiPending } from "./recommendation/RecommendationAiPending";

export const RecommendGate = (): JSX.Element | null => {
    const router = useRouter();
    const {
        chartKind,
        chartSpec,
        dataset,
        hydrated,
        intent,
        lastRecommendationFromCache,
        mapping,
        receipt,
        selectionMode,
        setChartSpec,
        setMapping,
    } = useAppState();
    const [resolvedSpec, setResolvedSpec] = useState<ChartSpec | null>(null);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (!intent.trim() || dataset === null) {
            router.replace("/upload");
        }
    }, [dataset, hydrated, intent, router]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (selectionMode !== "ai") {
            router.replace("/recommend/choose");
        }
    }, [hydrated, router, selectionMode]);

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

    if (!hydrated || selectionMode !== "ai") {
        return (
            <div className="container page-enter" style={{ paddingTop: 32, paddingBottom: 32 }}>
                <PageSkeleton lines={5} />
            </div>
        );
    }

    if (!receipt || !chartKind) {
        return <RecommendationAiPending />;
    }

    if (!resolvedSpec || dataset === null) {
        return (
            <div className="container page-enter" style={{ paddingTop: 32, paddingBottom: 32 }}>
                <PageSkeleton lines={5} />
            </div>
        );
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
