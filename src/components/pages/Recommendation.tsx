"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppState, type LoupeDataset } from "@/app/providers";
import { BarErrorChart } from "@/components/charts/d3/BarErrorChart";
import { BoxChart } from "@/components/charts/d3/BoxChart";
import { KaplanMeierChart } from "@/components/charts/d3/KaplanMeierChart";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { CHART_PREVIEWS } from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import { aggregateBarError } from "@/lib/chartSpec/aggregators/barError";
import { aggregateBoxPlot } from "@/lib/chartSpec/aggregators/boxPlot";
import { BoxPlotError } from "@/lib/chartSpec/aggregators/boxPlot.types";
import { aggregateKaplanMeier } from "@/lib/chartSpec/aggregators/kaplanMeier";
import { KaplanMeierError } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import type { ErrorBarType } from "@/lib/chartSpec/aggregators/barError.types";
import { inferErrorTypeFromReceipt } from "@/lib/chartSpec/aggregators/errorBars";
import type { ChartSlug } from "@/components/charts/chartPreviews";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

import { formatOverrideHistory } from "./formatOverrideHistory";
import { getOverrideDisplayState } from "./overrideDisplay";
import { mappingForBarError, type BarErrorMappingResult } from "./recommendation/barErrorMapping";
import { ErrorBarsUnavailable } from "./recommendation/ErrorBarsUnavailable";
import { ErrorTypeToggle } from "./recommendation/ErrorTypeToggle";
import { MissingDataWarning } from "./recommendation/MissingDataWarning";
import { RecommendationOverride } from "./RecommendationOverride";
import { RecommendationWhy } from "./RecommendationWhy";

/** Exclusive threshold: exactly 5% drop rate does not show MissingDataWarning. */
const MISSING_DATA_WARN_DROP_RATE = 0.05;

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
    const { appendOverride, intent, mapping, setSelectionMode, updateLatestOverrideReason } =
        useAppState();
    let barErrorMapResult: BarErrorMappingResult = { mapping };
    let barErrorAggregation: ReturnType<typeof aggregateBarError> | undefined;

    if (chartKind === "barError") {
        barErrorMapResult = mappingForBarError(mapping, dataset.inferences);
        barErrorAggregation = aggregateBarError(dataset.rows, barErrorMapResult.mapping);
    }

    const barErrorMapping = barErrorMapResult.mapping;

    let kmPlotResult:
        | null
        | { status: "missing" }
        | { status: "ok"; data: ReturnType<typeof aggregateKaplanMeier> }
        | { status: "error"; message: string } = null;

    if (chartKind === "km") {
        if (mapping.time === undefined || mapping.event === undefined) {
            kmPlotResult = { status: "missing" };
        }
        else {
            try {
                kmPlotResult = {
                    data: aggregateKaplanMeier(dataset.rows, mapping),
                    status: "ok",
                };
            }
            catch (err) {
                if (err instanceof KaplanMeierError) {
                    kmPlotResult = { message: err.message, status: "error" };
                }
                else {
                    throw err;
                }
            }
        }
    }

    let boxPlotResult:
        | null
        | { status: "missing" }
        | { status: "ok"; data: ReturnType<typeof aggregateBoxPlot> }
        | { status: "error"; message: string } = null;

    if (chartKind === "box") {
        if (mapping.outcome === undefined) {
            boxPlotResult = { status: "missing" };
        }
        else {
            try {
                boxPlotResult = {
                    data: aggregateBoxPlot(dataset.rows, mapping),
                    status: "ok",
                };
            }
            catch (err) {
                if (err instanceof BoxPlotError) {
                    boxPlotResult = { message: err.message, status: "error" };
                }
                else {
                    throw err;
                }
            }
        }
    }

    const [errorType, setErrorType] = useState<ErrorBarType>(() => inferErrorTypeFromReceipt(receipt));
    const primaryAlt = receipt.alternatives[0];
    const AltPreview = primaryAlt !== undefined ? CHART_PREVIEWS[primaryAlt.slug] : null;
    const transform = receipt.transformations[0];
    const text = receipt.intent || intent;
    const words = text.split(/(\s+)/);
    const [phase, setPhase] = useState<number>(0);
    const [overrideOpen, setOverrideOpen] = useState<boolean>(false);
    const { isDisplayOverridden, title } = getOverrideDisplayState(receipt, chartKind);

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
                                    {title}
                                </h3>
                            </div>
                            <span className="muted mono rec-chart-tag">FIG · DRAFT</span>
                        </div>
                        <div className="rec-chart-frame">
                            {isDisplayOverridden ? (
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
                                    {chartKind === "barError" && spec.kind === "barError" && barErrorAggregation ? (
                                        <>
                                            {barErrorAggregation.missing.dropRate >
                                            MISSING_DATA_WARN_DROP_RATE ? (
                                                <MissingDataWarning info={barErrorAggregation.missing} />
                                            ) : null}
                                            {barErrorMapResult.inferredOutcome !== undefined ? (
                                                <p
                                                    className="rec-inferred-outcome muted small"
                                                    role="status"
                                                >
                                                    Outcome column inferred:{" "}
                                                    <strong className="mono">
                                                        {barErrorMapResult.inferredOutcome}
                                                    </strong>
                                                    {" "}
                                                    — confirm on the map step.
                                                </p>
                                            ) : null}
                                            {barErrorAggregation.groups.length === 0 ? (
                                                <div className="rec-chart-empty muted" role="status">
                                                    <p>
                                                        No plottable groups yet. On the map step, assign{" "}
                                                        <strong>Group / arm</strong> and{" "}
                                                        <strong>Outcome</strong> to categorical and numeric
                                                        columns (e.g. treatment + blood pressure change).
                                                    </p>
                                                    {barErrorMapping.outcome === undefined ||
                                                    barErrorMapping.group === undefined ? (
                                                        <p className="small">
                                                            Missing:{" "}
                                                            {barErrorMapping.group === undefined
                                                                ? "group"
                                                                : ""}
                                                            {barErrorMapping.group === undefined &&
                                                            barErrorMapping.outcome === undefined
                                                                ? " · "
                                                                : ""}
                                                            {barErrorMapping.outcome === undefined
                                                                ? "outcome"
                                                                : ""}
                                                        </p>
                                                    ) : (
                                                        <p className="small">
                                                            Rows may use non-numeric outcomes (check decimal
                                                            commas) or missing values in those columns.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <BarErrorChart
                                                        spec={spec}
                                                        groups={barErrorAggregation.groups}
                                                        errorType={errorType}
                                                    />
                                                    <ErrorBarsUnavailable
                                                        groups={barErrorAggregation.groups}
                                                    />
                                                    <ErrorTypeToggle
                                                        value={errorType}
                                                        onChange={setErrorType}
                                                    />
                                                </>
                                            )}
                                        </>
                                    ) : chartKind === "km" && spec.kind === "km" ? (
                                        <>
                                            {kmPlotResult?.status === "missing" ? (
                                                <div className="rec-chart-empty muted" role="status">
                                                    <p>
                                                        No plottable survival data yet. On the map step,
                                                        assign <strong>Time variable</strong> and{" "}
                                                        <strong>Event indicator</strong> (0 = censored, 1 =
                                                        event).
                                                    </p>
                                                </div>
                                            ) : null}
                                            {kmPlotResult?.status === "error" ? (
                                                <div className="rec-chart-empty muted" role="alert">
                                                    <p>{kmPlotResult.message}</p>
                                                </div>
                                            ) : null}
                                            {kmPlotResult?.status === "ok" ? (
                                                <KaplanMeierChart
                                                    data={kmPlotResult.data}
                                                    spec={spec}
                                                />
                                            ) : null}
                                        </>
                                    ) : chartKind === "box" && spec.kind === "box" ? (
                                        <>
                                            {boxPlotResult?.status === "missing" ? (
                                                <div className="rec-chart-empty muted" role="status">
                                                    <p>
                                                        No plottable distribution data yet. On the map
                                                        step, assign <strong>Outcome</strong> to a numeric
                                                        column and <strong>Group / arm</strong> to a
                                                        categorical column.
                                                    </p>
                                                </div>
                                            ) : null}
                                            {boxPlotResult?.status === "error" ? (
                                                <div className="rec-chart-empty muted" role="alert">
                                                    <p>{boxPlotResult.message}</p>
                                                </div>
                                            ) : null}
                                            {boxPlotResult?.status === "ok" ? (
                                                <BoxChart data={boxPlotResult.data} spec={spec} />
                                            ) : null}
                                        </>
                                    ) : (
                                        <ChartRenderer spec={spec} />
                                    )}
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
                        isDisplayOverridden={isDisplayOverridden}
                        onUseAlt={onUseAlt}
                        phase={phase}
                        primaryAlt={primaryAlt}
                        receipt={receipt}
                        updateLatestOverrideReason={updateLatestOverrideReason}
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
