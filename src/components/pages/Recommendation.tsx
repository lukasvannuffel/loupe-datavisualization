"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState } from "@/app/providers";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { CHART_PREVIEWS } from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import type { ChartSlug } from "@/components/charts/chartPreviews";
import type { ChartSpec, PlotData, Receipt } from "@/lib/chartSpec/types";

import { formatOverrideHistory } from "./formatOverrideHistory";
import { RecommendationOverride } from "./RecommendationOverride";
import { RecommendationWhy } from "./RecommendationWhy";

export type RecommendationProps = {
    readonly chartKind: ChartSpec["kind"];
    readonly fromCache: boolean;
    readonly plotData: PlotData;
    readonly receipt: Receipt;
    readonly spec: ChartSpec;
};

export const Recommendation = ({
    chartKind,
    fromCache,
    plotData,
    receipt,
    spec,
}: RecommendationProps): JSX.Element => {
    const router = useRouter();
    const { appendOverride, intent, setSelectionMode } = useAppState();
    const primaryAlt = receipt.alternatives[0];
    const AltPreview = primaryAlt !== undefined ? CHART_PREVIEWS[primaryAlt.slug] : null;
    const transform = receipt.transformations[0];
    const text = receipt.intent || intent;
    const words = text.split(/(\s+)/);
    const [phase, setPhase] = useState<number>(0);
    const [overrideOpen, setOverrideOpen] = useState<boolean>(false);
    const hasOverrides = receipt.overrides.length > 0;

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
        if (primaryAlt === undefined || !isSpecKind(primaryAlt.slug)) {
            return;
        }
        if (primaryAlt.slug === chartKind) {
            return;
        }
        appendOverride({
            at: new Date().toISOString(),
            from: chartKind,
            reason: "from AI alternatives",
            to: primaryAlt.slug,
        });
    };
    const onSwitchToManual = (): void => {
        setSelectionMode("manual");
        router.push("/recommend/manual");
    };
    const onOverrideSelect = (target: ChartSpec["kind"]): void => {
        if (target === chartKind) {
            return;
        }
        appendOverride({ at: new Date().toISOString(), from: chartKind, to: target });
        setOverrideOpen(false);
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
                            {hasOverrides ? (
                                <span
                                    role="status"
                                    className="rec-override-badge mono muted"
                                    title={formatOverrideHistory(receipt.overrides)}
                                    aria-label={`Chart overridden. ${formatOverrideHistory(receipt.overrides)}`}
                                >
                                    Overridden by you
                                </span>
                            ) : null}
                            {phase >= 2 ? (
                                <div className="rec-chart-reveal">
                                    <ChartRenderer plotData={plotData} spec={spec} />
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

                    <RecommendationWhy
                        AltPreview={AltPreview}
                        onUseAlt={onUseAlt}
                        phase={phase}
                        primaryAlt={primaryAlt}
                        receipt={receipt}
                    />
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

            <RecommendationOverride
                current={chartKind}
                onClose={() => setOverrideOpen(false)}
                onSelect={onOverrideSelect}
                open={overrideOpen}
            />
        </div>
    );
};

const isSpecKind = (slug: ChartSlug): slug is ChartSpec["kind"] =>
    slug === "km" || slug === "barError" || slug === "box" || slug === "xy";
