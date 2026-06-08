"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useAppState } from "@/app/providers";
import Analyzing from "@/components/loading/Analyzing";
import { toAiColumns } from "@/lib/ai/toAiColumns";
import { validateMapping } from "@/lib/roles";
import { useToast } from "@/lib/toast/useToast";

import { useRecommendation } from "../uploadMap/useRecommendation";
import { recommendationErrorCopy } from "./recommendationErrorCopy";

export const RecommendationAiPending = (): JSX.Element | null => {
    const router = useRouter();
    const { toast } = useToast();
    const {
        dataset,
        hydrated,
        intent,
        mapping,
        selectionMode,
        setChartKind,
        setChartSlug,
        setLastRecommendationFromCache,
        setReceipt,
        setSelectionMode,
    } = useAppState();

    const payload = useMemo(() => {
        if (dataset === null) {
            return null;
        }

        return {
            columns: toAiColumns(dataset.inferences),
            intent,
            mapping,
        };
    }, [dataset, intent, mapping]);

    const mappingValid =
        dataset !== null && validateMapping(mapping, dataset.inferences).status === "valid";

    const shouldRecommend =
        hydrated &&
        selectionMode === "ai" &&
        intent.trim().length > 0 &&
        dataset !== null &&
        mappingValid;

    const { run, state } = useRecommendation({
        onSuccess: (rec, kind, fromCache) => {
            setReceipt(rec);
            setChartKind(kind);
            setChartSlug(kind);
            setLastRecommendationFromCache(fromCache);
        },
    });

    useEffect(() => {
        if (!shouldRecommend || payload === null || state.status !== "idle") {
            return;
        }

        // Concurrent / StrictMode re-invokes are deduped inside useRecommendation.run().
        void run(payload);
    }, [payload, run, shouldRecommend, state.status]);

    useEffect(() => {
        if (state.status !== "error") {
            return;
        }

        const copy = recommendationErrorCopy(state.code);

        toast({
            description: copy.description,
            durationMs: 0,
            title: copy.title,
            variant: copy.variant,
        });
    }, [state, toast]);

    if (!shouldRecommend) {
        return null;
    }

    if (state.status === "error") {
        const rateLimited = state.code === "RATE_LIMITED";
        const errorCopy = recommendationErrorCopy(state.code);

        return (
            <div className="analyzing-page analyzing-page--error page-enter">
                <div className="container">
                    <div className="map-ai-error" role="alert">
                        <div className="map-ai-error-title">{errorCopy.title}</div>
                        <p className="muted">{errorCopy.description}</p>
                        <div className="map-ai-error-actions">
                            <button
                                type="button"
                                className="btn btn--secondary btn--sm"
                                disabled={rateLimited}
                                onClick={() => {
                                    if (payload !== null) {
                                        void run(payload);
                                    }
                                }}
                            >
                                Try again
                            </button>
                            <button
                                type="button"
                                className="btn btn--quiet btn--sm"
                                onClick={() => {
                                    setSelectionMode("manual");
                                    router.push("/recommend/manual");
                                }}
                            >
                                Pick chart manually
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <Analyzing />;
};
