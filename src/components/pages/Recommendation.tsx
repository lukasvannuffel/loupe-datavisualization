"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAppState, type LoupeDataset } from "@/app/providers";
import { CHART_PREVIEWS } from "@/components/charts/chartPreviews";
import { aggregateBarError } from "@/lib/chartSpec/aggregators/barError";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";
import { computeConfigHash } from "@/lib/receipt/configHash";

import { getOverrideDisplayState } from "./overrideDisplay";
import { canCustomizeRecommendation } from "./recommendation/canCustomize";
import { mappingForBarError, type BarErrorMappingResult } from "./recommendation/barErrorMapping";
import { isSpecKind } from "./recommendation/isSpecKind";
import { RecommendationActionsPanel } from "./recommendation/RecommendationActionsPanel";
import { RecommendationChartPreview } from "./recommendation/RecommendationChartPreview";
import { RecommendationIntentBand } from "./recommendation/RecommendationIntentBand";
import { useRecommendationLiveSpec } from "./recommendation/useRecommendationLiveSpec";
import { useRecommendationPhase } from "./recommendation/useRecommendationPhase";
import { RecommendationWhy } from "./RecommendationWhy";

export type RecommendationProps = {
    readonly chartKind: ChartSpec["kind"];
    readonly dataset: LoupeDataset;
    readonly fromCache: boolean;
    readonly receipt: Receipt;
    readonly spec: ChartSpec;
};

export const Recommendation = ({
    chartKind,
    dataset,
    fromCache,
    receipt,
    spec,
}: RecommendationProps): JSX.Element => {
    const router = useRouter();
    const {
        appendOverride,
        chartSpec,
        intent,
        mapping,
        setSelectionMode,
        updateLatestOverrideReason,
    } = useAppState();

    const liveSpec = useRecommendationLiveSpec(spec, receipt);
    const phase = useRecommendationPhase();
    const [configHash, setConfigHash] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        void computeConfigHash(liveSpec).then((hash) => {
            if (!cancelled) {
                setConfigHash(hash);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [liveSpec]);

    let barErrorMapResult: BarErrorMappingResult = { mapping };
    let barErrorAggregation: ReturnType<typeof aggregateBarError> | undefined;

    if (chartKind === "barError") {
        barErrorMapResult = mappingForBarError(mapping, dataset.inferences);
        barErrorAggregation = aggregateBarError(dataset.rows, barErrorMapResult.mapping);
    }

    const barErrorMapping = barErrorMapResult.mapping;
    const primaryAlt = receipt.alternatives[0];
    const AltPreview = primaryAlt !== undefined ? CHART_PREVIEWS[primaryAlt.slug] : null;
    const transform = receipt.transformations[0];
    const text = receipt.intent || intent;
    const words = text.split(/(\s+)/);
    const { isDisplayOverridden, title } = getOverrideDisplayState(receipt, chartKind);

    const canCustomize = canCustomizeRecommendation({
        barErrorAggregation,
        chartKind,
        chartSpec,
        mapping,
        phase,
    });

    const onUseAlt = (): void => {
        if (primaryAlt === undefined || !isSpecKind(primaryAlt.slug)) {
            return;
        }
        if (primaryAlt.slug === chartKind) {
            return;
        }
        appendOverride({
            at: new Date().toISOString(),
            from: chartKind,
            to: primaryAlt.slug,
        });
    };
    const onSwitchToManual = (): void => {
        setSelectionMode("manual");
        router.push("/recommend/manual");
    };
    const handleCustomize = (): void => {
        if (!canCustomize) {
            return;
        }
        router.push("/export");
    };

    const transformVerb = transform?.verb ?? "becomes a";
    const transformChart = transform?.chart ?? `${receipt.recommendation.chartName}.`;

    return (
        <div className="rec-page page-enter">
            <div className="container">
                <RecommendationIntentBand
                    fromCache={fromCache}
                    phase={phase}
                    transformChart={transformChart}
                    transformVerb={transformVerb}
                    words={words}
                />

                <div className="rec-grid">
                    <div className="rec-grid-col">
                        <RecommendationChartPreview
                            barErrorAggregation={barErrorAggregation}
                            barErrorMapResult={barErrorMapResult}
                            barErrorMapping={barErrorMapping}
                            canCustomize={canCustomize}
                            chartKind={chartKind}
                            dataset={dataset}
                            isDisplayOverridden={isDisplayOverridden}
                            liveSpec={liveSpec}
                            mapping={mapping}
                            phase={phase}
                            receipt={receipt}
                            title={title}
                        />

                        <RecommendationActionsPanel
                            canCustomize={canCustomize}
                            changeCount={receipt.overrides.length}
                            configHash={configHash}
                            onCustomize={handleCustomize}
                            onSwitchToManual={onSwitchToManual}
                        />
                    </div>

                    <RecommendationWhy
                        AltPreview={AltPreview}
                        isDisplayOverridden={isDisplayOverridden}
                        onUseAlt={onUseAlt}
                        phase={phase}
                        primaryAlt={primaryAlt}
                        receipt={receipt}
                        updateLatestOverrideReason={updateLatestOverrideReason}
                    />
                </div>
            </div>
        </div>
    );
};
