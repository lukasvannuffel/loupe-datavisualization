"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/app/providers";
import {
    CHART_PREVIEWS,
    getPublicationChart,
    type ChartSlug,
} from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

import { RecommendationOverride } from "./RecommendationOverride";
export type RecommendationProps = {
    readonly chartKind: ChartSpec["kind"];
    readonly fromCache: boolean;
    readonly receipt: Receipt;
};

export const Recommendation = ({
    chartKind,
    fromCache,
    receipt,
}: RecommendationProps): JSX.Element => {
    const router = useRouter();
    const { chartSlug, intent, setChartSlug, setSelectionMode } = useAppState();
    const activeSlug: ChartSlug = chartSlug ?? chartKind;
    const ChartComponent = getPublicationChart(activeSlug);
    const primaryAlt = receipt.alternatives[0];
    const AltPreview = primaryAlt !== undefined ? CHART_PREVIEWS[primaryAlt.slug] : null;
    const transform = receipt.transformations[0];
    const text = receipt.intent || intent;
    const words = text.split(/(\s+)/);
    const [phase, setPhase] = useState<number>(0);
    const [overrideOpen, setOverrideOpen] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        const arm = (ms: number, n: number) =>
            window.setTimeout(() => {
                if (!cancelled) {
                    setPhase(n);
                }
            }, ms);
        const t1 = arm(200, 1);
        const t2 = arm(700, 2);
        const t3 = arm(1100, 3);
        return () => {
            cancelled = true;
            [t1, t2, t3].forEach((t) => window.clearTimeout(t));
        };
    }, []);

    const onUseAlt = (): void => {
        if (primaryAlt !== undefined) {
            setChartSlug(primaryAlt.slug);
        }
    };
    const onSwitchToManual = (): void => {
        setSelectionMode("manual");
        router.push("/recommend/manual");
    };
    const transformVerb = transform?.verb ?? "becomes a";
    const transformChart = transform?.chart ?? `${receipt.recommendation.chartName}.`;

    return (
        <div className="rec-page page-enter">
            <div className="container">
                <div className="rec-intent-band">
                    <div className="rec-intent-meta">
                        <Eyebrow>The finding · 03 / 03 · RECOMMEND</Eyebrow>
                        {fromCache ? <span className="rec-cache-badge mono muted">cached · instant</span> : null}
                    </div>
                    <p className="rec-intent">
                        <span className="rec-intent-stack">
                            <span className={"rec-intent-line " + (phase >= 1 ? "is-out" : "")}>
                                {words.map((w, i) => (
                                    <span key={i} className={"rec-word " + (phase >= 1 ? "dissolving" : "")} style={{ transitionDelay: phase === 1 ? `${i * 35}ms` : "0ms" }}>
                                        {w}
                                    </span>
                                ))}
                            </span>
                            <span className={"rec-intent-line rec-intent-line--after " + (phase >= 2 ? "is-in" : "")}>
                                <span className="serif" style={{ color: "var(--gray)" }}>
                                    {transformVerb}
                                </span>{" "}
                                <span className="serif blue" style={{ fontStyle: "italic" }}>
                                    {transformChart}
                                </span>
                            </span>
                        </span>
                    </p>
                </div>

                <div className="rec-grid">
                    <div className="rec-chart">
                        <div className="rec-chart-head">
                            <div>
                                <Eyebrow>Recommended figure</Eyebrow>
                                <h3 className="rec-chart-title" contentEditable suppressContentEditableWarning>
                                    {receipt.recommendation.chartName}
                                </h3>
                            </div>
                            <span className="muted mono rec-chart-tag">FIG · DRAFT</span>
                        </div>
                        <div className="rec-chart-frame">
                            {phase >= 2 ? (
                                <div className="rec-chart-reveal">
                                    <ChartComponent animated />
                                </div>
                            ) : (
                                <div className="rec-chart-frame-loading">
                                    <RingLoader />
                                </div>
                            )}
                        </div>
                        <div className="rec-chart-hint">
                            <span>
                                <span className="ring ring--xs" />
                                Click any axis label, title, or legend to edit inline.
                            </span>
                        </div>
                    </div>

                    <div className={"rec-why rec-why-stage" + (phase >= 3 ? " is-visible" : "")}>
                        <Eyebrow>Why this chart</Eyebrow>
                        <h4>{receipt.recommendation.headline}</h4>
                        <div className="rec-why-block">
                            <span className="label">{receipt.recommendation.becauseTitle}</span>
                            <p>{receipt.recommendation.because}</p>
                        </div>
                        <div className="rec-why-block">
                            <span className="label">{receipt.recommendation.handlesTitle}</span>
                            <p>{receipt.recommendation.handles}</p>
                        </div>
                        {primaryAlt !== undefined && AltPreview !== null ? (
                            <div className="rec-why-block">
                                <span className="label">We considered, then set aside</span>
                                <div className="rec-alt">
                                    <div className="rec-alt-mini">
                                        <AltPreview h={36} w={64} />
                                    </div>
                                    <div>
                                        <div className="rec-alt-name">{primaryAlt.name}</div>
                                        <div className="rec-alt-reason">{primaryAlt.reason}</div>
                                    </div>
                                    <button type="button" onClick={onUseAlt}>
                                        Use instead →
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        <div className="rec-why-block">
                            <span className="label">{receipt.testsTitle}</span>
                            <p className="rec-why-block-tests">
                                {receipt.tests.map((t, i) => (
                                    <span key={`${t.label}-${i}`}>
                                        · {t.label}
                                        {t.notes !== undefined ? ` — ${t.notes}` : ""}
                                        {i < receipt.tests.length - 1 ? <br /> : null}
                                    </span>
                                ))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rec-bottombar">
                <div className="container rec-bottombar-inner">
                    <div className="rec-bottombar-meta">
                        <span>
                            <span className="ring ring--xs" />
                            Auto-saved locally
                        </span>
                        <span className="mono">cfg · 4f7a · 2 changes</span>
                    </div>
                    <div className="rec-bottombar-actions">
                        <button type="button" className="btn btn--quiet btn--sm" data-testid="switch-to-manual" onClick={onSwitchToManual}>
                            Pick a chart myself
                        </button>
                        <button type="button" className="btn btn--quiet btn--sm" onClick={() => setOverrideOpen(true)}>
                            Try a different chart
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm">
                            Save to project
                        </button>
                        <button type="button" className="btn btn--primary btn--sm" onClick={() => router.push("/export")}>
                            Customize <span className="arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>

            <RecommendationOverride current={activeSlug} onClose={() => setOverrideOpen(false)} onSelect={(slug) => setChartSlug(slug)} open={overrideOpen} />
        </div>
    );
};
