"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
    CHART_PREVIEWS,
    getPublicationChart,
    type ChartSlug,
} from "@/components/charts/chartPreviews";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import { useAppState } from "@/app/providers";
import { RecommendationOverride } from "./RecommendationOverride";

const RECO_INTENT = "Compare 5-year survival between treatment arms in this cohort";

type RationaleCopy = {
    chartName: string;
    headline: string;
    becauseTitle: string;
    because: string;
    handlesTitle: string;
    handles: string;
    altSlug: ChartSlug;
    altName: string;
    altReason: string;
    testsTitle: string;
    tests: readonly string[];
    transformVerb: string;
    transformChart: string;
};

const RECOMMEND_COPY: Record<ChartSlug, RationaleCopy> = {
    km: {
        chartName: "Kaplan–Meier curve",
        headline: "Kaplan–Meier was the right shape for this finding.",
        becauseTitle: "Because",
        because:
            "Your description compares two groups across a follow-up window — a time-to-event question. Your dataset has time_to_event_months and event_observed, the two columns this estimator needs.",
        handlesTitle: "It handles censoring",
        handles:
            "Of 610 patients, 218 were censored before 60 months. Kaplan–Meier accounts for them; a simple proportion at 5 years would not.",
        altSlug: "forest",
        altName: "Forest plot of subgroup HRs",
        altReason:
            "Better when comparing many pre-specified subgroups in one figure — not your stated finding.",
        testsTitle: "Tests we ran on your data",
        tests: [
            "log-rank p < 0.001",
            "Cox HR 0.74 (95% CI 0.61–0.89)",
            "Schoenfeld residuals: PH assumption ✓",
        ],
        transformVerb: "becomes a",
        transformChart: "Kaplan–Meier curve.",
    },
    barError: {
        chartName: "Bar chart with error bars",
        headline: "A bar chart with error bars maps your group means cleanly.",
        becauseTitle: "Because",
        because:
            "Your finding compares an outcome across a small number of named groups — bars with errors are the canonical clinical format.",
        handlesTitle: "It shows uncertainty",
        handles:
            "We estimated 95% CIs from the within-group variance. The error caps reflect them; toggle SD or SEM in the editor.",
        altSlug: "groupedBar",
        altName: "Grouped bar chart",
        altReason:
            "Better when the same groups are measured across two conditions — adds a second series per band.",
        testsTitle: "Tests we ran on your data",
        tests: [
            "ANOVA F = 18.4, p < 0.001",
            "Tukey HSD pairwise: 3 of 6 contrasts significant",
        ],
        transformVerb: "becomes a",
        transformChart: "bar chart with error bars.",
    },
    groupedBar: {
        chartName: "Grouped bar chart",
        headline: "A grouped bar chart compares two series across your time points.",
        becauseTitle: "Because",
        because:
            "You're comparing two arms across the same time points. Grouped bars sit side-by-side at each band, keeping comparisons within band and across band readable.",
        handlesTitle: "It separates pattern from noise",
        handles:
            "Error caps are sized from the SEM by default. Significance brackets can be added in the editor where pairwise tests reach threshold.",
        altSlug: "barError",
        altName: "Bar chart with error bars",
        altReason:
            "Better when there's only one series per group — fewer bars, less visual contention.",
        testsTitle: "Tests we ran on your data",
        tests: [
            "Mixed-model time × arm: p = 0.012",
            "Pairwise contrasts at 12 mo: p = 0.034",
        ],
        transformVerb: "becomes a",
        transformChart: "grouped bar chart.",
    },
    dot: {
        chartName: "Cleveland dot plot",
        headline: "A Cleveland dot plot ranks the agents you compared.",
        becauseTitle: "Because",
        because:
            "Single-series rankings read better as dots than as bars — less ink, easier to compare adjacent values.",
        handlesTitle: "It scales cleanly",
        handles:
            "Dot plots stay legible past 8 categories where bars start to crowd. Add error bars in the editor if your sample sizes vary.",
        altSlug: "barError",
        altName: "Bar chart with error bars",
        altReason: "Better when readers expect a familiar bar format and groups are few.",
        testsTitle: "Tests we ran on your data",
        tests: ["Ranks reported with bootstrap 95% CIs"],
        transformVerb: "becomes a",
        transformChart: "Cleveland dot plot.",
    },
    forest: {
        chartName: "Forest plot",
        headline: "A forest plot summarizes effects across pre-specified subgroups.",
        becauseTitle: "Because",
        because:
            "Forest plots stack multiple HR estimates with their CIs in a single column — useful when reporting subgroup heterogeneity.",
        handlesTitle: "It surfaces interaction",
        handles:
            "We tested for interaction between arm and each subgroup; only one passed the multiplicity threshold.",
        altSlug: "km",
        altName: "Kaplan–Meier curve",
        altReason: "Better when the finding is one overall comparison across time.",
        testsTitle: "Tests we ran on your data",
        tests: [
            "Subgroup interaction p = 0.041",
            "Heterogeneity I² = 22%",
        ],
        transformVerb: "becomes a",
        transformChart: "forest plot.",
    },
    box: {
        chartName: "Box plot",
        headline: "A box plot summarizes the distribution within each group.",
        becauseTitle: "Because",
        because:
            "Box plots show median, IQR, and outliers in one mark — good when distribution shape matters to the finding.",
        handlesTitle: "It shows skew",
        handles:
            "Median is robust to extreme values; the whiskers and outliers expose tails the mean would hide.",
        altSlug: "violin",
        altName: "Violin plot",
        altReason: "Better when density shape (bimodality, etc.) carries meaning.",
        testsTitle: "Tests we ran on your data",
        tests: ["Kruskal–Wallis p = 0.003", "Dunn pairwise: 2 / 3 significant"],
        transformVerb: "becomes a",
        transformChart: "box plot.",
    },
    violin: {
        chartName: "Violin plot",
        headline: "A violin plot reveals the full density behind each group.",
        becauseTitle: "Because",
        because:
            "Violins show where mass actually sits in each group — useful when bimodal or skewed distributions would mislead a box plot.",
        handlesTitle: "It exposes shape",
        handles:
            "Median ticks and IQR ribbons sit inside each violin so you don't lose box-plot reference marks.",
        altSlug: "box",
        altName: "Box plot",
        altReason: "Better when the audience expects a familiar distribution summary.",
        testsTitle: "Tests we ran on your data",
        tests: ["Kruskal–Wallis p < 0.001"],
        transformVerb: "becomes a",
        transformChart: "violin plot.",
    },
    roc: {
        chartName: "ROC curve",
        headline: "A ROC curve summarizes diagnostic performance across thresholds.",
        becauseTitle: "Because",
        because:
            "The finding is about discrimination — sensitivity vs specificity at every threshold. ROC is the canonical visualization.",
        handlesTitle: "It quantifies separation",
        handles: "We computed AUC with bootstrap 95% CIs and marked the Youden-optimal point.",
        altSlug: "bland",
        altName: "Bland–Altman plot",
        altReason: "Better when the question is method agreement, not discrimination.",
        testsTitle: "Tests we ran on your data",
        tests: ["AUC = 0.86 (95% CI 0.82–0.90)", "DeLong p = 0.014 vs comparator"],
        transformVerb: "becomes a",
        transformChart: "ROC curve.",
    },
    volcano: {
        chartName: "Volcano plot",
        headline: "A volcano plot maps effect size against significance across many tests.",
        becauseTitle: "Because",
        because:
            "Differential expression studies test thousands of features. Volcano plots show effect and significance simultaneously, with thresholds drawn explicitly.",
        handlesTitle: "It surfaces strongest hits",
        handles:
            "Top hits are labeled by their gene symbol; FDR cutoff is fixed at 0.05 with the line drawn in.",
        altSlug: "forest",
        altName: "Forest plot",
        altReason: "Better when the comparisons are pre-specified and few.",
        testsTitle: "Tests we ran on your data",
        tests: ["BH-adjusted p < 0.05 → 142 features", "|log2FC| ≥ 1 → 38 features"],
        transformVerb: "becomes a",
        transformChart: "volcano plot.",
    },
    bland: {
        chartName: "Bland–Altman plot",
        headline: "A Bland–Altman plot quantifies agreement between two methods.",
        becauseTitle: "Because",
        because:
            "Your finding compares two measurement methods on the same subjects. Bland–Altman shows the bias and limits of agreement directly.",
        handlesTitle: "It shows proportional bias",
        handles:
            "We tested for trend in the differences against the mean — proportional bias was not significant.",
        altSlug: "roc",
        altName: "ROC curve",
        altReason: "Better when the question is discrimination, not agreement.",
        testsTitle: "Tests we ran on your data",
        tests: [
            "Bias = +0.32 (95% CI -0.12 – 0.76)",
            "LoA = ± 1.96 SD",
        ],
        transformVerb: "becomes a",
        transformChart: "Bland–Altman plot.",
    },
    funnel: {
        chartName: "Funnel plot",
        headline: "A funnel plot screens for publication bias in your meta-analysis.",
        becauseTitle: "Because",
        because:
            "When you've pooled effect sizes across studies, asymmetry in the funnel suggests small-study effects.",
        handlesTitle: "It tests asymmetry",
        handles:
            "Egger's regression test ran across the included studies; the result is annotated on the figure.",
        altSlug: "forest",
        altName: "Forest plot",
        altReason: "Better when reporting the pooled estimate alongside subgroup contributions.",
        testsTitle: "Tests we ran on your data",
        tests: ["Egger's test p = 0.071", "Trim-and-fill: 2 imputed studies"],
        transformVerb: "becomes a",
        transformChart: "funnel plot.",
    },
    spaghetti: {
        chartName: "Spaghetti plot",
        headline: "A spaghetti plot shows per-subject trajectories.",
        becauseTitle: "Because",
        because:
            "When the finding is about within-subject change, you want every line to be visible — spaghetti plots preserve individual trajectories.",
        handlesTitle: "It shows variability",
        handles:
            "We overlay group means as bolder lines so the population trend stays readable above the per-subject noise.",
        altSlug: "box",
        altName: "Box plot",
        altReason: "Better when the audience cares about distribution shape, not change over time.",
        testsTitle: "Tests we ran on your data",
        tests: ["Mixed-model time slope: p = 0.022"],
        transformVerb: "becomes a",
        transformChart: "spaghetti plot.",
    },
    bar: {
        chartName: "Bar chart",
        headline: "A bar chart compares group counts cleanly.",
        becauseTitle: "Because",
        because:
            "Your finding compares a single series across a small number of named categories — bars are the canonical clinical format.",
        handlesTitle: "It stays simple",
        handles:
            "No error bars, no overlays — just heights you can compare at a glance.",
        altSlug: "barError",
        altName: "Bar with error bars",
        altReason: "Better when within-group uncertainty matters to the finding.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-category counts only"],
        transformVerb: "becomes a",
        transformChart: "bar chart.",
    },
    barHorizontal: {
        chartName: "Horizontal bar chart",
        headline: "A horizontal bar chart fits long category names.",
        becauseTitle: "Because",
        because:
            "Your categories have long labels that would crowd a vertical x-axis. Horizontal bars keep them readable.",
        handlesTitle: "It scales with categories",
        handles:
            "Sorted descending so the eye lands on the biggest values first.",
        altSlug: "lollipop",
        altName: "Lollipop chart",
        altReason: "Lighter visual weight when many categories crowd a horizontal layout.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-category counts only"],
        transformVerb: "becomes a",
        transformChart: "horizontal bar chart.",
    },
    stackedBar: {
        chartName: "Stacked bar chart",
        headline: "A stacked bar shows subgroup composition within each category.",
        becauseTitle: "Because",
        because:
            "You want to compare both the total and the within-category breakdown — stacks keep both visible at the same scale.",
        handlesTitle: "It shows mix and total",
        handles:
            "Segment heights are absolute counts; bar totals carry exposure.",
        altSlug: "stackedBar100",
        altName: "100% stacked bar",
        altReason: "Better when the relative split matters more than the totals.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-segment counts within category"],
        transformVerb: "becomes a",
        transformChart: "stacked bar chart.",
    },
    stackedBar100: {
        chartName: "100% stacked bar",
        headline: "A 100% stacked bar isolates the proportional split.",
        becauseTitle: "Because",
        because:
            "Your story is about share, not totals. Normalizing each bar to 100% makes the mix directly comparable.",
        handlesTitle: "It hides totals on purpose",
        handles:
            "If totals matter, drop the normalization and switch to a stacked bar.",
        altSlug: "stackedBar",
        altName: "Stacked bar",
        altReason: "Better when both totals and breakdown carry meaning.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-segment proportions"],
        transformVerb: "becomes a",
        transformChart: "100% stacked bar.",
    },
    line: {
        chartName: "Line chart",
        headline: "A line chart traces continuous trend across an ordered x-axis.",
        becauseTitle: "Because",
        because:
            "Your x-axis is ordered (time, dose) and connecting points across it shows trend, not isolated values.",
        handlesTitle: "It carries one or two series",
        handles:
            "A second series is encoded with a dash to keep it readable in monochrome print.",
        altSlug: "spaghetti",
        altName: "Spaghetti plot",
        altReason: "Better when per-subject trajectories matter, not group means.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-visit means · per-arm trend"],
        transformVerb: "becomes a",
        transformChart: "line chart.",
    },
    scatter: {
        chartName: "Scatter plot",
        headline: "A scatter plot shows the joint shape of two continuous variables.",
        becauseTitle: "Because",
        because:
            "Your finding is about a relationship — scatter is the canonical view, with a fitted line summarizing trend.",
        handlesTitle: "It surfaces pattern",
        handles:
            "We overlaid a linear regression. Outliers stay visible; non-linear shape would suggest a different model.",
        altSlug: "bland",
        altName: "Bland–Altman",
        altReason: "Better when the question is method agreement on paired measurements.",
        testsTitle: "Tests we ran on your data",
        tests: ["Pearson r = 0.62", "Linear fit p < 0.001"],
        transformVerb: "becomes a",
        transformChart: "scatter plot.",
    },
    xy: {
        chartName: "XY plot",
        headline: "An XY plot fits trajectories or correlations in one unified layer.",
        becauseTitle: "Because",
        because:
            "Your mapping pairs an X and Y axis — line connects ordered points, scatter exposes spread, and both can combine when the finding needs both.",
        handlesTitle: "It adapts to the question",
        handles:
            "Regression and error bands are optional overlays; switch modes without changing the underlying aggregated series.",
        altSlug: "line",
        altName: "Line chart",
        altReason: "Better when only the connecting trend matters and scatter would distract.",
        testsTitle: "Tests we ran on your data",
        tests: ["Mixed-model time × arm: p = 0.034", "Regression slope CI overlaid when enabled"],
        transformVerb: "becomes an",
        transformChart: "XY plot.",
    },
    histogram: {
        chartName: "Histogram",
        headline: "A histogram exposes the shape of a single continuous variable.",
        becauseTitle: "Because",
        because:
            "You're describing a distribution — spread, skew, modes. Histograms show all three at a glance.",
        handlesTitle: "It chooses bin width",
        handles:
            "Default bin width via Freedman–Diaconis; override in the editor if you have a domain reason.",
        altSlug: "violin",
        altName: "Violin plot",
        altReason: "Better when comparing distributions across groups, not summarizing one.",
        testsTitle: "Tests we ran on your data",
        tests: ["Mean, SD, IQR computed locally"],
        transformVerb: "becomes a",
        transformChart: "histogram.",
    },
    pie: {
        chartName: "Pie chart",
        headline: "A pie chart shows proportions of a small whole.",
        becauseTitle: "Because",
        because:
            "Your categories are few (six or fewer) and the story is about parts of a whole — pie reads instantly.",
        handlesTitle: "It refuses to overflow",
        handles:
            "Past six slices the pie loses readability — switch to a bar or lollipop in the editor.",
        altSlug: "donut",
        altName: "Donut chart",
        altReason: "Better when you want a focal headline number anchored in the centre.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-category proportions"],
        transformVerb: "becomes a",
        transformChart: "pie chart.",
    },
    donut: {
        chartName: "Donut chart",
        headline: "A donut chart pairs proportions with a headline number.",
        becauseTitle: "Because",
        because:
            "You want to lead with one big number while still showing the category mix around it.",
        handlesTitle: "It centres the metric",
        handles:
            "The hole carries the headline; segments still carry the breakdown.",
        altSlug: "pie",
        altName: "Pie chart",
        altReason: "Better when there's no single headline number to anchor.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-category proportions"],
        transformVerb: "becomes a",
        transformChart: "donut chart.",
    },
    lollipop: {
        chartName: "Lollipop chart",
        headline: "A lollipop chart ranks many categories without bar weight.",
        becauseTitle: "Because",
        because:
            "Past 10 categories, bars start to feel heavy. Lollipops keep the same information with less ink.",
        handlesTitle: "It scales further than bars",
        handles:
            "Sorted descending so the strongest values land first.",
        altSlug: "barHorizontal",
        altName: "Horizontal bar",
        altReason: "Better when the audience expects familiar bar marks.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-category point estimates"],
        transformVerb: "becomes a",
        transformChart: "lollipop chart.",
    },
    pairedPlot: {
        chartName: "Paired plot",
        headline: "A paired plot shows same-subject change between two timepoints.",
        becauseTitle: "Because",
        because:
            "When every subject is measured twice, lines between dots show the direction and size of change per subject.",
        handlesTitle: "It exposes responders",
        handles:
            "Most lines slope one way and a few don't — those are the patients worth investigating.",
        altSlug: "spaghetti",
        altName: "Spaghetti plot",
        altReason: "Better when there are more than two timepoints per subject.",
        testsTitle: "Tests we ran on your data",
        tests: ["Paired test: p < 0.001"],
        transformVerb: "becomes a",
        transformChart: "paired plot.",
    },
    sankey: {
        chartName: "Sankey diagram",
        headline: "A Sankey diagram traces flows between stages.",
        becauseTitle: "Because",
        because:
            "Your finding is about how patients move — pathway, treatment switching, CONSORT-style enrolment. Sankey is the canonical format.",
        handlesTitle: "It preserves volume",
        handles:
            "Flow widths are proportional to per-transition counts; nothing gets lost between stages.",
        altSlug: "sunburst",
        altName: "Sunburst chart",
        altReason: "Better when the structure is hierarchical containment, not stage-to-stage flow.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-transition counts across stages"],
        transformVerb: "becomes a",
        transformChart: "Sankey diagram.",
    },
    sunburst: {
        chartName: "Sunburst chart",
        headline: "A sunburst chart shows multi-level hierarchical proportions.",
        becauseTitle: "Because",
        because:
            "Your hierarchy has more than one level (diagnosis → subtype → mutation). Pie collapses; sunburst preserves the depth.",
        handlesTitle: "It nests cleanly",
        handles:
            "Each ring is one level. Sequential shading by depth keeps the hierarchy legible.",
        altSlug: "sankey",
        altName: "Sankey diagram",
        altReason: "Better when the structure is stage-to-stage flow, not hierarchical containment.",
        testsTitle: "Tests we ran on your data",
        tests: ["Per-level proportions"],
        transformVerb: "becomes a",
        transformChart: "sunburst chart.",
    },
};

export const Recommendation = (): JSX.Element => {
    const router = useRouter();
    const { hydrated, intent, chartSlug, setChartSlug, selectionMode, setSelectionMode } =
        useAppState();

    const activeSlug: ChartSlug = chartSlug ?? "km";
    const copy = RECOMMEND_COPY[activeSlug];
    const ChartComponent = getPublicationChart(activeSlug);
    const AltPreview = CHART_PREVIEWS[copy.altSlug];

    const text = intent || RECO_INTENT;
    const words = text.split(/(\s+)/);
    const [phase, setPhase] = useState<number>(0);
    const [overrideOpen, setOverrideOpen] = useState<boolean>(false);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (selectionMode !== "ai") {
            router.replace("/recommend/choose");
        }
    }, [hydrated, selectionMode, router]);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 1100);
        const t2 = setTimeout(() => setPhase(2), 2300);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    useEffect(() => {
        setPhase(2);
    }, [activeSlug]);

    const onUseAlt = (): void => {
        setChartSlug(copy.altSlug);
    };

    const onSwitchToManual = (): void => {
        setSelectionMode("manual");
        router.push("/recommend/manual");
    };

    return (
        <div className="rec-page page-enter">
            <div className="container">
                <div className="rec-intent-band">
                    <Eyebrow>The finding · 03 / 03 · RECOMMEND</Eyebrow>
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
                                className={"rec-intent-line rec-intent-line--after " + (phase >= 2 ? "is-in" : "")}
                            >
                                <span className="serif" style={{ color: "var(--gray)" }}>
                                    {copy.transformVerb}
                                </span>{" "}
                                <span className="serif blue" style={{ fontStyle: "italic" }}>
                                    {copy.transformChart}
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
                                    Five-year overall survival by treatment arm
                                </h3>
                            </div>
                            <span className="muted mono rec-chart-tag">FIG · DRAFT</span>
                        </div>
                        <div className="rec-chart-frame">
                            {phase >= 2 && <ChartComponent animated />}
                            {phase < 2 && (
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

                    <div className="rec-why">
                        <Eyebrow>Why this chart</Eyebrow>
                        <h4>{copy.headline}</h4>

                        <div className="rec-why-block">
                            <span className="label">{copy.becauseTitle}</span>
                            <p>{copy.because}</p>
                        </div>

                        <div className="rec-why-block">
                            <span className="label">{copy.handlesTitle}</span>
                            <p>{copy.handles}</p>
                        </div>

                        <div className="rec-why-block">
                            <span className="label">We considered, then set aside</span>
                            <div className="rec-alt">
                                <div className="rec-alt-mini">
                                    <AltPreview w={64} h={36} />
                                </div>
                                <div>
                                    <div className="rec-alt-name">{copy.altName}</div>
                                    <div className="rec-alt-reason">{copy.altReason}</div>
                                </div>
                                <button type="button" onClick={onUseAlt}>
                                    Use instead →
                                </button>
                            </div>
                        </div>

                        <div className="rec-why-block">
                            <span className="label">{copy.testsTitle}</span>
                            <p className="rec-why-block-tests">
                                {copy.tests.map((t, i) => (
                                    <span key={i}>
                                        · {t}
                                        {i < copy.tests.length - 1 && <br />}
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
                        <button
                            type="button"
                            className="btn btn--quiet btn--sm"
                            data-testid="switch-to-manual"
                            onClick={onSwitchToManual}
                        >
                            Pick a chart myself
                        </button>
                        <button
                            type="button"
                            className="btn btn--quiet btn--sm"
                            onClick={() => setOverrideOpen(true)}
                        >
                            Try a different chart
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm">
                            Save to project
                        </button>
                        <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => router.push("/export")}
                        >
                            Customize <span className="arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>

            <RecommendationOverride
                open={overrideOpen}
                onClose={() => setOverrideOpen(false)}
                current={activeSlug}
                onSelect={(slug) => setChartSlug(slug)}
            />
        </div>
    );
};
