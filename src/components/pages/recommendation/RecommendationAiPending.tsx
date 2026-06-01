"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useAppState } from "@/app/providers";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import { toAiColumns } from "@/lib/ai/toAiColumns";
import { useToast } from "@/lib/toast/useToast";

import { useRecommendation } from "../uploadMap/useRecommendation";
import { recommendationErrorCopy } from "./recommendationErrorCopy";
import { useRecommendationPhase } from "./useRecommendationPhase";

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

    const phase = useRecommendationPhase();

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

    const shouldRecommend =
        hydrated &&
        selectionMode === "ai" &&
        intent.trim().length > 0 &&
        dataset !== null &&
        payload !== null;

    const { run, state } = useRecommendation({
        onSuccess: (rec, kind, fromCache) => {
            setReceipt(rec);
            setChartKind(kind);
            setChartSlug(kind);
            setLastRecommendationFromCache(fromCache);
        },
    });

    useEffect(() => {
        if (!shouldRecommend || payload === null) {
            return;
        }

        void run(payload);
    }, [payload, run, shouldRecommend]);

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

    const words = intent.split(/(\s+)/);
    const rateLimited = state.status === "error" && state.code === "RATE_LIMITED";
    const errorCopy = state.status === "error" ? recommendationErrorCopy(state.code) : null;

    return (
        <div className="rec-page page-enter">
            <div className="container">
                <div className="rec-intent-band">
                    <div className="rec-intent-meta">
                        <Eyebrow>The finding · 03 / 03 · RECOMMEND</Eyebrow>
                    </div>
                    <p className="rec-intent">
                        <span className="rec-intent-stack">
                            <span className={"rec-intent-line " + (phase >= 1 ? "is-out" : "")}>
                                {words.map((w, i) => (
                                    <span
                                        key={i}
                                        className={"rec-word " + (phase >= 1 ? "dissolving" : "")}
                                        style={{ transitionDelay: phase === 1 ? `${i * 35}ms` : "0ms" }}
                                    >
                                        {w}
                                    </span>
                                ))}
                            </span>
                            <span
                                className={
                                    "rec-intent-line rec-intent-line--after " +
                                    (phase >= 2 ? "is-in" : "")
                                }
                            >
                                <span className="serif muted" style={{ fontStyle: "italic" }}>
                                    {state.status === "loading"
                                        ? "Analysing your data…"
                                        : "…"}
                                </span>
                            </span>
                        </span>
                    </p>
                </div>

                <div className="rec-grid">
                    <div className="rec-chart">
                        <div className="rec-chart-frame">
                            <div className="rec-chart-frame-loading">
                                <RingLoader />
                            </div>
                        </div>
                    </div>
                </div>

                {errorCopy !== null ? (
                    <div className="map-ai-error" role="alert">
                        <div className="map-ai-error-title">{errorCopy.title}</div>
                        <p className="muted">{errorCopy.description}</p>
                        <div className="map-ai-error-actions">
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
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
                ) : null}
            </div>
        </div>
    );
};
