"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    getPublicationChart,
    type ChartSlug,
} from "@/components/charts/chartPreviews";
import type {
    PublicationChartProps,
    StatAnnotation,
} from "@/components/charts/types";
import { resolvePalette } from "@/components/charts/d3/palettes";
import { SpecChartPanel } from "@/components/charts/SpecChartPanel";
import { CustomizationRail } from "@/components/customization/CustomizationRail";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState } from "@/app/providers";
import type { SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import { resolveWizardChartSpec } from "@/lib/chartSpec/resolveWizardChartSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";
import { CustomSection } from "./CustomSection";
import { ExportChatLauncher } from "./ExportChat/ExportChatLauncher";
import { ExportChatPanel } from "./ExportChat/ExportChatPanel";
import type { ChartConfig, ChatRevision, RailSection } from "./ExportChat/types";

type Palette = {
    id: string;
    name: string;
    note: string;
    a: string;
    b: string;
};

const PALETTES: readonly Palette[] = [
    { id: "editorial", name: "Editorial", note: "Default · ink + gray", a: "#0E0E0E", b: "#6B6B66" },
    { id: "okabe-ito", name: "Okabe–Ito", note: "Colorblind-safe", a: "#0072B2", b: "#E69F00" },
    { id: "wong", name: "Wong", note: "Colorblind-safe", a: "#009E73", b: "#D55E00" },
    { id: "ibm", name: "IBM Design", note: "Colorblind-safe", a: "#648FFF", b: "#DC267F" },
    { id: "tol-vibrant", name: "Tol Vibrant", note: "Colorblind-safe", a: "#0077BB", b: "#EE7733" },
    { id: "deuter", name: "Deuteranopia-tuned", note: "Blue + amber", a: "#1F4E79", b: "#B5651D" },
    { id: "mono", name: "Monochrome", note: "Print-safe", a: "#0E0E0E", b: "#9A9A93" },
];

type SlugDefaults = {
    title: string;
    caption: string;
    xLabel: string;
    yLabel: string;
    legendA: string;
    legendB: string;
    metaLine: string;
    method: string;
    rationale: string;
};

const SLUG_DEFAULTS: Record<ChartSlug, SlugDefaults> = {
    km: {
        title: "Five-year overall survival by treatment arm.",
        caption:
            "Estimates by Kaplan–Meier method. Comparison by log-rank test. Hazard ratio from Cox proportional hazards. CI from profile likelihood.",
        xLabel: "MONTHS SINCE RANDOMIZATION",
        yLabel: "SURVIVAL PROBABILITY",
        legendA: "Treatment A — n=312",
        legendB: "Treatment B — n=298",
        metaLine: "n = 610 · censored = 218",
        method: "Kaplan–Meier, log-rank, Cox PH",
        rationale:
            "Time-to-event with right-censoring; two-arm comparison; PH assumption verified by Schoenfeld residuals.",
    },
    barError: {
        title: "5-year survival probability by stage.",
        caption:
            "Bar heights are group means with 95% confidence intervals from within-group variance. ANOVA F = 18.4, p < 0.001.",
        xLabel: "DISEASE STAGE",
        yLabel: "5-YEAR SURVIVAL PROBABILITY",
        legendA: "Cohort",
        legendB: "",
        metaLine: "n = 610 · groups = 4",
        method: "Group means with 95% CI · one-way ANOVA",
        rationale:
            "Single-series across pre-specified named groups; uncertainty visualized via 95% CI bars.",
    },
    groupedBar: {
        title: "Response rate over time, by treatment arm.",
        caption:
            "Bars show group means with SEM at each time point. Mixed-model time × arm interaction p = 0.012.",
        xLabel: "TIME POINT",
        yLabel: "RESPONSE RATE",
        legendA: "Treatment A",
        legendB: "Treatment B",
        metaLine: "n = 610 · arms = 2 · time-points = 4",
        method: "Mixed-effects model · pairwise contrasts",
        rationale:
            "Two arms compared at the same repeated time points; bands keep within-time and across-time comparisons readable.",
    },
    dot: {
        title: "Objective response rate across checkpoint inhibitors.",
        caption:
            "Dots are point estimates of the objective response rate per agent in the cohort. Bootstrap 95% CIs available on request.",
        xLabel: "OBJECTIVE RESPONSE RATE",
        yLabel: "AGENT",
        legendA: "",
        legendB: "",
        metaLine: "n = 1,284 · agents = 8",
        method: "Per-agent point estimates · bootstrap CIs",
        rationale:
            "Single-series ranking across many categories; dot plots stay legible past 8 entries where bars crowd.",
    },
    forest: {
        title: "Subgroup hazard ratios.",
        caption:
            "Per-subgroup HR with 95% CI from Cox PH; interaction p reported per row.",
        xLabel: "HAZARD RATIO",
        yLabel: "SUBGROUP",
        legendA: "Subgroups",
        legendB: "",
        metaLine: "n = 610 · subgroups = 7",
        method: "Cox PH · per-subgroup contrasts",
        rationale: "Multiple pre-specified subgroups; forest stacks effects with shared scale.",
    },
    box: {
        title: "Tumor size distribution by stage.",
        caption:
            "Boxes are IQR with median; whiskers extend to 1.5 × IQR. Kruskal–Wallis p = 0.003.",
        xLabel: "STAGE",
        yLabel: "TUMOR SIZE (mm)",
        legendA: "",
        legendB: "",
        metaLine: "n = 610 · groups = 4",
        method: "Distribution summary · Kruskal–Wallis",
        rationale: "Distributional comparison across a few named categories.",
    },
    violin: {
        title: "Biomarker concentration density by responder status.",
        caption:
            "Violins show smoothed density per group; central tick is median. Kruskal–Wallis p < 0.001.",
        xLabel: "RESPONDER STATUS",
        yLabel: "BIOMARKER (ng/mL)",
        legendA: "",
        legendB: "",
        metaLine: "n = 184 · groups = 3",
        method: "Density estimation · Kruskal–Wallis",
        rationale: "Distribution shape (bimodality) carried meaning beyond a box plot.",
    },
    roc: {
        title: "Diagnostic performance of new assay.",
        caption: "AUC = 0.86 (95% CI 0.82–0.90). Youden-optimal threshold marked.",
        xLabel: "1 − SPECIFICITY",
        yLabel: "SENSITIVITY",
        legendA: "New assay",
        legendB: "Reference",
        metaLine: "n = 412 · positive = 168",
        method: "ROC analysis · DeLong test",
        rationale: "Discrimination across thresholds with explicit cutoff marker.",
    },
    volcano: {
        title: "Differential expression — responders vs non-responders.",
        caption: "Cutoffs: FDR < 0.05 and |log2FC| ≥ 1. 142 features pass FDR; 38 pass both.",
        xLabel: "log2 FOLD CHANGE",
        yLabel: "−log10 ADJUSTED P",
        legendA: "Significant",
        legendB: "Not significant",
        metaLine: "features = 18,422",
        method: "BH-adjusted p · effect size",
        rationale: "Many tests; effect and significance plotted together with explicit thresholds.",
    },
    bland: {
        title: "Method agreement — new assay vs reference.",
        caption: "Bias = +0.32 (95% CI -0.12 – 0.76). Limits of agreement at ±1.96 SD.",
        xLabel: "MEAN OF METHODS",
        yLabel: "DIFFERENCE (NEW − REF)",
        legendA: "Subjects",
        legendB: "",
        metaLine: "n = 412 paired",
        method: "Bland–Altman analysis",
        rationale: "Two-method paired measurements; agreement quantified directly.",
    },
    funnel: {
        title: "Funnel plot — pooled effect by precision.",
        caption: "Egger's regression p = 0.071. Trim-and-fill imputes 2 studies.",
        xLabel: "EFFECT SIZE",
        yLabel: "STANDARD ERROR",
        legendA: "Studies",
        legendB: "",
        metaLine: "studies = 38",
        method: "Egger · trim-and-fill",
        rationale: "Meta-analysis bias check.",
    },
    spaghetti: {
        title: "FEV1 trajectories per subject over 12 months.",
        caption: "Faint lines: per-subject. Bold lines: group means. Mixed-model time slope p = 0.022.",
        xLabel: "MONTHS",
        yLabel: "FEV1 (L)",
        legendA: "Treatment",
        legendB: "Control",
        metaLine: "n = 184 · visits = 5",
        method: "Mixed-effects model",
        rationale: "Within-subject change; per-subject lines preserve individual trajectories.",
    },
    bar: {
        title: "Patients per stage at baseline.",
        caption: "Counts per category. No within-group variance assumed.",
        xLabel: "DISEASE STAGE",
        yLabel: "PATIENTS (n)",
        legendA: "Cohort",
        legendB: "",
        metaLine: "n = 610 · groups = 5",
        method: "Per-category counts",
        rationale: "Single-series counts across a small set of named groups.",
    },
    barHorizontal: {
        title: "Most frequent adverse events.",
        caption: "Counts per event term. Ranked descending; long names sit on the y-axis.",
        xLabel: "FREQUENCY",
        yLabel: "EVENT",
        legendA: "Cohort",
        legendB: "",
        metaLine: "n = 610 · events = 24",
        method: "Per-term counts",
        rationale: "Many categories with long labels — horizontal bars stay legible without rotation.",
    },
    stackedBar: {
        title: "Adverse-event grades per arm.",
        caption: "Bars stack grade I–III counts within each arm. Totals reflect cohort exposure.",
        xLabel: "ARM",
        yLabel: "EVENTS (n)",
        legendA: "Grade I",
        legendB: "Grade II",
        metaLine: "n = 610 · arms = 4",
        method: "Per-arm composition counts",
        rationale: "Composition within categories — segment counts visible on a shared scale.",
    },
    stackedBar100: {
        title: "Response category mix per regimen.",
        caption: "Bars normalized to 100%. Segment heights are relative shares.",
        xLabel: "REGIMEN",
        yLabel: "SHARE",
        legendA: "CR",
        legendB: "PR",
        metaLine: "n = 610 · arms = 4",
        method: "Per-arm proportions",
        rationale: "Relative split is the story; absolute totals would distract.",
    },
    line: {
        title: "Mean tumor diameter by cycle, per arm.",
        caption: "Means per visit. Solid: arm A. Dashed: arm B.",
        xLabel: "CYCLE",
        yLabel: "MEAN DIAMETER (mm)",
        legendA: "Arm A",
        legendB: "Arm B",
        metaLine: "n = 610 · cycles = 6",
        method: "Per-visit means",
        rationale: "Continuous trend across an ordered axis; two-series comparison.",
    },
    scatter: {
        title: "Baseline biomarker vs response magnitude.",
        caption: "Linear regression overlaid. r = 0.62, p < 0.001.",
        xLabel: "BASELINE BIOMARKER",
        yLabel: "RESPONSE (Δ%)",
        legendA: "Subjects",
        legendB: "",
        metaLine: "n = 412 paired",
        method: "Linear regression",
        rationale: "Two continuous variables; correlation summarized with a fitted line.",
    },
    xy: {
        title: "Outcome trajectories by treatment arm.",
        caption:
            "Lines connect visit means; optional scatter shows subject-level points when aggregated. Mixed-model time × arm p = 0.034.",
        xLabel: "VISIT (WEEKS)",
        yLabel: "LAB VALUE",
        legendA: "Arm A",
        legendB: "Arm B",
        metaLine: "n = 284 · visits = 5 · arms = 2",
        method: "Mixed-effects · linear regression overlay",
        rationale: "Unified XY layer for trajectories or correlation; toggle line, scatter, or both.",
    },
    histogram: {
        title: "Age-at-diagnosis distribution.",
        caption: "Bin width chosen by Freedman–Diaconis. n = 610.",
        xLabel: "AGE (years)",
        yLabel: "FREQUENCY",
        legendA: "Cohort",
        legendB: "",
        metaLine: "n = 610",
        method: "Density estimation",
        rationale: "Single-variable distribution shape.",
    },
    pie: {
        title: "Primary tumor site distribution.",
        caption: "Proportions of the cohort by primary site. Six slices or fewer.",
        xLabel: "",
        yLabel: "",
        legendA: "Cohort",
        legendB: "",
        metaLine: "n = 610 · sites = 4",
        method: "Per-category proportions",
        rationale: "Single-level proportions of a small whole.",
    },
    donut: {
        title: "Overall response rate at week 12.",
        caption: "Center value is the headline; ring shows category mix.",
        xLabel: "",
        yLabel: "",
        legendA: "Responders",
        legendB: "",
        metaLine: "n = 610",
        method: "Per-category proportions",
        rationale: "Pie variant with a focal headline number.",
    },
    lollipop: {
        title: "Most frequent concomitant medications.",
        caption: "Stems sorted descending by frequency. Dots mark per-medication counts.",
        xLabel: "FREQUENCY",
        yLabel: "MEDICATION",
        legendA: "Cohort",
        legendB: "",
        metaLine: "n = 610 · meds = 15",
        method: "Per-term counts",
        rationale: "Ranking many categories where bars get visually noisy.",
    },
    pairedPlot: {
        title: "QoL score change per patient, baseline → month 6.",
        caption: "Lines connect each patient's two timepoints. Most subjects improved.",
        xLabel: "TIMEPOINT",
        yLabel: "QoL SCORE",
        legendA: "Subjects",
        legendB: "",
        metaLine: "n = 184 paired",
        method: "Paired test",
        rationale: "Same-subject change between two timepoints — direction visible per patient.",
    },
    sankey: {
        title: "Patient pathway from screening to outcome.",
        caption: "Flow widths are per-stage transition counts. Three stages shown.",
        xLabel: "",
        yLabel: "",
        legendA: "Stages",
        legendB: "",
        metaLine: "n = 610 · stages = 3",
        method: "Per-transition counts",
        rationale: "Flows between stages — pathways and switching are first-class.",
    },
    sunburst: {
        title: "Diagnosis → subtype → mutation status.",
        caption: "Concentric rings encode hierarchy depth. Outer ring labels available on tap.",
        xLabel: "",
        yLabel: "",
        legendA: "Cohort",
        legendB: "",
        metaLine: "n = 610 · levels = 3",
        method: "Per-level proportions",
        rationale: "Multi-level hierarchical proportions where pie collapses.",
    },
};

const supportsTwoSeriesLegend = (slug: ChartSlug): boolean =>
    slug === "km" || slug === "groupedBar" || slug === "spaghetti";

const supportsKMOverlays = (slug: ChartSlug): boolean => slug === "km";

const supportsErrorBars = (slug: ChartSlug): boolean =>
    slug === "barError" || slug === "groupedBar";

const supportsAnnotations = (slug: ChartSlug): boolean =>
    slug === "barError" || slug === "groupedBar" || slug === "box" || slug === "violin";

const supportsDashB = (slug: ChartSlug): boolean =>
    slug === "km" || slug === "groupedBar";

type AnnotationDraft = {
    kind: "bracket" | "pLabel";
    from: number;
    to: number;
    target: number;
    label: "*" | "**" | "***" | "ns";
    pValue: string;
};

const DEFAULT_ANNOTATION_DRAFT: AnnotationDraft = {
    kind: "bracket",
    from: 0,
    to: 1,
    target: 0,
    label: "*",
    pValue: "",
};

const isSpecKind = (kind: ChartSlug): kind is ChartSpec["kind"] =>
    kind === "km" || kind === "barError" || kind === "box" || kind === "xy";

export const Export = (): JSX.Element => {
    const router = useRouter();
    const {
        chartKind,
        chartSlug: appChartSlug,
        chartSpec,
        dataset,
        hydrated,
        mapping,
        setChartSpec,
        setMapping,
    } = useAppState();

    const slug: ChartSlug = appChartSlug ?? "km";
    const useSpecFigure = dataset !== null && chartSpec !== null && isSpecKind(chartSpec.kind);
    const slugDefaults = SLUG_DEFAULTS[slug];
    const ChartComponent = useMemo(() => getPublicationChart(slug), [slug]);

    const [dpi, setDpi] = useState<number>(300);
    const [copied, setCopied] = useState<boolean>(false);

    const [paletteId, setPaletteId] = useState<string>("editorial");
    const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];

    const [title, setTitle] = useState<string>(slugDefaults.title);
    const [eyebrow, setEyebrow] = useState<string>("Figure 1");
    const [figureNumber, setFigureNumber] = useState<string>("1");
    const [caption, setCaption] = useState<string>(slugDefaults.caption);
    const [xLabel, setXLabel] = useState<string>(slugDefaults.xLabel);
    const [yLabel, setYLabel] = useState<string>(slugDefaults.yLabel);
    const [legendA, setLegendA] = useState<string>(slugDefaults.legendA);
    const [legendB, setLegendB] = useState<string>(slugDefaults.legendB);
    const [showLegend, setShowLegend] = useState<boolean>(true);
    const [showAtRisk, setShowAtRisk] = useState<boolean>(true);
    const [showStats, setShowStats] = useState<boolean>(true);
    const [showGrid, setShowGrid] = useState<boolean>(false);
    const [dashB, setDashB] = useState<boolean>(slug === "km");
    const [strokeWeight, setStrokeWeight] = useState<number>(1.5);
    const [errorBarType, setErrorBarType] = useState<"sd" | "sem" | "ci95">("ci95");
    const [annotations, setAnnotations] = useState<readonly StatAnnotation[]>([]);
    const [annotationDraft, setAnnotationDraft] = useState<AnnotationDraft>(DEFAULT_ANNOTATION_DRAFT);

    const [openSection, setOpenSection] = useState<string | null>("colors");

    const [chatOpen, setChatOpen] = useState<boolean>(false);
    const [chatRevisions, setChatRevisions] = useState<ChatRevision[]>([]);

    const [mobileRailOpen, setMobileRailOpen] = useState<boolean>(false);

    const [liveSpec, setLiveSpec] = useState<ChartSpec | null>(chartSpec);
    const liveSpecRef = useRef(liveSpec);
    liveSpecRef.current = liveSpec;

    useEffect(() => {
        setLiveSpec(chartSpec);
        liveSpecRef.current = chartSpec;
    }, [chartSpec]);

    useEffect(() => {
        if (
            !hydrated ||
            chartKind === null ||
            dataset === null ||
            (chartSpec !== null && chartSpec.kind === chartKind)
        ) {
            return;
        }

        const { spec, mapping: nextMapping } = resolveWizardChartSpec({
            chartKind,
            chartSpec: null,
            dataset,
            mapping,
        });

        if (nextMapping.id !== mapping.id) {
            setMapping(nextMapping);
        }

        setChartSpec(spec);
    }, [chartKind, chartSpec, dataset, hydrated, mapping, setChartSpec, setMapping]);

    const onSpecChange = useCallback(
        (updater: SpecUpdater): void => {
            const prev = liveSpecRef.current;
            if (prev === null) {
                return;
            }

            const next = updater(prev);
            liveSpecRef.current = next;
            setLiveSpec(next);
            setChartSpec(next);
        },
        [setChartSpec],
    );

    const xyErrorBandsAvailable =
        liveSpec?.kind === "xy" &&
        (liveSpec.mode === "line" || (liveSpec.mode === "both" && mapping.id !== undefined));

    const specFigureTitle =
        useSpecFigure && liveSpec !== null ? resolveChartLabels(liveSpec).title : title;

    const receiptPaletteLabel =
        useSpecFigure && liveSpec !== null
            ? resolvePalette(liveSpec)
            : palette.name.toLowerCase();

    useEffect(() => {
        setTitle(slugDefaults.title);
        setCaption(slugDefaults.caption);
        setXLabel(slugDefaults.xLabel);
        setYLabel(slugDefaults.yLabel);
        setLegendA(slugDefaults.legendA);
        setLegendB(slugDefaults.legendB);
        setAnnotations([]);
    }, [slug, slugDefaults]);

    useEffect(() => {
        if (!mobileRailOpen) {
            return;
        }

        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                setMobileRailOpen(false);
            }
        };

        window.addEventListener("keydown", onKey);
        document.body.classList.add("is-locked");

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-locked");
        };
    }, [mobileRailOpen]);

    const openMobileRail = (): void => {
        setChatOpen(false);
        setMobileRailOpen(true);
    };

    const openChat = (): void => {
        setMobileRailOpen(false);
        setChatOpen(true);
    };

    const onCopy = (): void => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    const onReset = (): void => {
        setPaletteId("editorial");
        setTitle(slugDefaults.title);
        setEyebrow(`Figure ${figureNumber}`);
        setCaption(slugDefaults.caption);
        setXLabel(slugDefaults.xLabel);
        setYLabel(slugDefaults.yLabel);
        setLegendA(slugDefaults.legendA);
        setLegendB(slugDefaults.legendB);
        setShowLegend(true);
        setShowAtRisk(true);
        setShowStats(true);
        setShowGrid(false);
        setDashB(slug === "km");
        setStrokeWeight(1.5);
        setErrorBarType("ci95");
        setAnnotations([]);
        setChatRevisions([]);
    };

    const applyPatch = (patch: Partial<ChartConfig>): void => {
        if (patch.paletteId !== undefined) {
            setPaletteId(patch.paletteId);
        }

        if (patch.title !== undefined) {
            setTitle(patch.title);
        }

        if (patch.eyebrow !== undefined) {
            setEyebrow(patch.eyebrow);
        }

        if (patch.figureNumber !== undefined) {
            setFigureNumber(patch.figureNumber);
            setEyebrow(`Figure ${patch.figureNumber}`);
        }

        if (patch.caption !== undefined) {
            setCaption(patch.caption);
        }

        if (patch.xLabel !== undefined) {
            setXLabel(patch.xLabel);
        }

        if (patch.yLabel !== undefined) {
            setYLabel(patch.yLabel);
        }

        if (patch.legendA !== undefined) {
            setLegendA(patch.legendA);
        }

        if (patch.legendB !== undefined) {
            setLegendB(patch.legendB);
        }

        if (patch.showLegend !== undefined) {
            setShowLegend(patch.showLegend);
        }

        if (patch.showAtRisk !== undefined) {
            setShowAtRisk(patch.showAtRisk);
        }

        if (patch.showStats !== undefined) {
            setShowStats(patch.showStats);
        }

        if (patch.showGrid !== undefined) {
            setShowGrid(patch.showGrid);
        }

        if (patch.dashB !== undefined) {
            setDashB(patch.dashB);
        }

        if (patch.strokeWeight !== undefined) {
            setStrokeWeight(patch.strokeWeight);
        }

        if (patch.errorBarType !== undefined) {
            setErrorBarType(patch.errorBarType);
        }

        if (patch.annotations !== undefined) {
            setAnnotations(patch.annotations);
        }
    };

    const appendRevision = (entry: string): void => {
        const revision: ChatRevision = {
            id: Math.random().toString(36).slice(2, 10),
            ts: Date.now(),
            entry,
        };

        setChatRevisions((prev) => [...prev, revision]);
    };

    const onOpenRailSection = (section: RailSection): void => {
        setOpenSection(section);
        setChatOpen(false);
        setMobileRailOpen(true);
    };

    const onAddAnnotation = (): void => {
        const nextLevel = annotations.reduce(
            (acc, a) => (a.kind === "bracket" && a.level >= acc ? a.level + 1 : acc),
            0,
        );

        if (annotationDraft.kind === "bracket") {
            const next: StatAnnotation = {
                kind: "bracket",
                from: annotationDraft.from,
                to: annotationDraft.to,
                label: annotationDraft.label,
                pValue: annotationDraft.pValue ? parseFloat(annotationDraft.pValue) : undefined,
                level: nextLevel,
            };

            setAnnotations([...annotations, next]);
        } else {
            const pValue = annotationDraft.pValue ? parseFloat(annotationDraft.pValue) : 0.05;
            const next: StatAnnotation = {
                kind: "pLabel",
                target: annotationDraft.target,
                pValue,
            };

            setAnnotations([...annotations, next]);
        }

        setAnnotationDraft(DEFAULT_ANNOTATION_DRAFT);
    };

    const onRemoveAnnotation = (idx: number): void => {
        setAnnotations(annotations.filter((_, i) => i !== idx));
    };

    const chartProps: PublicationChartProps = {
        animated: false,
        colorA: palette.a,
        colorB: palette.b,
        dashB,
        xLabel,
        yLabel,
        legendA,
        legendB,
        showLegend,
        showAtRisk,
        showStats,
        showGrid,
        strokeWeight,
        errorBarType,
        annotations,
    };

    const annotationGroupCount = slug === "barError" || slug === "box" ? 4 : slug === "violin" ? 3 : 4;

    return (
        <div className="export-page page-enter">
            <div className="container export-shell">
                <div className="export-main">
                    <Eyebrow>Final figure</Eyebrow>
                    <h1 className="export-title">Ready for the manuscript.</h1>

                    <div className="export-canvas">
                        <div className="export-canvas-head">
                            <div>
                                <div className="muted export-canvas-eyebrow">{eyebrow}</div>
                                <div className="serif export-canvas-title">{specFigureTitle}</div>
                            </div>
                            <div className="muted mono export-canvas-meta">{slugDefaults.metaLine}</div>
                        </div>
                        {useSpecFigure && liveSpec !== null && dataset !== null ? (
                            <>
                                <SpecChartPanel
                                    chartKind={liveSpec.kind}
                                    dataset={dataset}
                                    mapping={mapping}
                                    spec={liveSpec}
                                    onSpecChange={onSpecChange}
                                />
                                <p className="export-chart-hint muted small">
                                    <span className="ring ring--xs" />
                                    Click any axis label or title on the chart to edit inline.
                                </p>
                            </>
                        ) : (
                            <ChartComponent {...chartProps} />
                        )}
                        {caption && (
                            <div className="export-caption">
                                <span className="export-caption-num mono">Figure {figureNumber}.</span>{" "}
                                {caption}
                            </div>
                        )}
                    </div>

                    <div className="export-actions">
                        <button type="button" className="btn btn--primary btn--lg">
                            Download SVG{" "}
                            <span className="export-recommended-tag">· recommended</span>
                        </button>
                        <span className="btn btn--ghost btn--lg export-png">
                            Download PNG
                            <span className="export-dpi">
                                {[300, 600].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        className={dpi === v ? "active" : ""}
                                        onClick={() => setDpi(v)}
                                    >
                                        {v} dpi
                                    </button>
                                ))}
                            </span>
                        </span>
                        <button type="button" className="btn btn--ghost btn--lg" onClick={onCopy}>
                            {copied ? "Copied to clipboard ✓" : "Copy to clipboard"}
                        </button>
                    </div>

                    <div className="export-secondary">
                        <button
                            type="button"
                            className="btn btn--ghost btn--lg"
                            onClick={() => router.push("/dashboard")}
                        >
                            Save to project
                        </button>
                        <button
                            type="button"
                            className="btn btn--quiet btn--lg"
                            onClick={() => router.push("/upload")}
                        >
                            Start a new chart
                        </button>
                    </div>

                    <div className="export-receipt">
                        <h4>Reproducibility receipt</h4>
                        <p>
                            Paste into supplementary materials. Records the AI&apos;s reasoning, the
                            configuration hash, and the local computations.
                        </p>
                        <dl>
                            <dt>Generated</dt>
                            <dd>2026-04-28 14:32 CET</dd>
                            <dt>Config hash</dt>
                            <dd>sha256·4f7a9b…d21c</dd>
                            <dt>Method</dt>
                            <dd>{slugDefaults.method}</dd>
                            <dt>Sample</dt>
                            <dd>{slugDefaults.metaLine}</dd>
                            <dt>Palette</dt>
                            <dd>{receiptPaletteLabel}</dd>
                            <dt>Software</dt>
                            <dd>Loupe v0.4.2 · client-side</dd>
                            <dt>AI rationale</dt>
                            <dd className="export-receipt-prose">{slugDefaults.rationale}</dd>
                            {chatRevisions.length > 0 && (
                                <>
                                    <dt>Chat revisions</dt>
                                    <dd>
                                        <ol className="export-receipt-list">
                                            {chatRevisions.map((r) => (
                                                <li key={r.id}>{r.entry}</li>
                                            ))}
                                        </ol>
                                    </dd>
                                </>
                            )}
                        </dl>
                    </div>

                </div>

                <div
                    id="customize-sheet"
                    className={
                        (useSpecFigure ? "export-rail-sheet" : "customize-rail") +
                        (mobileRailOpen ? " is-mobile-open" : "")
                    }
                    role={mobileRailOpen ? "dialog" : undefined}
                    aria-modal={mobileRailOpen ? "true" : undefined}
                    aria-label={mobileRailOpen ? "Customize the figure" : undefined}
                >
                    <button
                        type="button"
                        className="customize-rail-close"
                        aria-label="Close customize panel"
                        onClick={() => setMobileRailOpen(false)}
                    >
                        ×
                    </button>
                    <div className="customize-rail-head">
                        <Eyebrow>Customize · {slug}</Eyebrow>
                        <h3>Tune the figure.</h3>
                        <p>
                            Defaults are chosen to match journal conventions. Override anything; the receipt
                            records what you changed.
                        </p>
                    </div>

                    {useSpecFigure && liveSpec !== null ? (
                        <CustomizationRail
                            errorBandsAvailable={xyErrorBandsAvailable}
                            mapping={mapping}
                            spec={liveSpec}
                            onSpecChange={onSpecChange}
                        />
                    ) : null}

                    {!useSpecFigure ? (
                    <CustomSection
                        id="colors"
                        label="Colors"
                        hint="Colorblind-safe options included"
                        open={openSection}
                        setOpen={setOpenSection}
                    >
                        <div className="palette-list">
                            {PALETTES.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={"palette-row " + (paletteId === p.id ? "is-active" : "")}
                                    onClick={() => setPaletteId(p.id)}
                                >
                                    <div className="palette-swatches">
                                        <span style={{ background: p.a }} />
                                        <span
                                            style={{
                                                background: p.b,
                                                ...(p.id !== "mono"
                                                    ? {}
                                                    : {
                                                          backgroundImage:
                                                              "repeating-linear-gradient(90deg, " +
                                                              p.b +
                                                              " 0 3px, transparent 3px 5px)",
                                                      }),
                                            }}
                                        />
                                    </div>
                                    <div className="palette-meta">
                                        <span className="palette-name">{p.name}</span>
                                        <span className="palette-note">{p.note}</span>
                                    </div>
                                    {paletteId === p.id && <span className="palette-check">✓</span>}
                                </button>
                            ))}
                        </div>
                        {supportsDashB(slug) && (
                            <div className="custom-row" style={{ marginTop: 14 }}>
                                <label className="custom-toggle">
                                    <input
                                        type="checkbox"
                                        checked={dashB}
                                        onChange={(e) => setDashB(e.target.checked)}
                                    />
                                    <span>
                                        Dashed second series{" "}
                                        <span className="muted">(redundant encoding)</span>
                                    </span>
                                </label>
                            </div>
                        )}
                        <div className="custom-row">
                            <label>
                                Stroke weight <span className="mono muted">{strokeWeight.toFixed(1)}px</span>
                            </label>
                            <input
                                type="range"
                                min="0.8"
                                max="3"
                                step="0.1"
                                value={strokeWeight}
                                onChange={(e) => setStrokeWeight(parseFloat(e.target.value))}
                            />
                        </div>
                    </CustomSection>
                    ) : null}

                    {!useSpecFigure ? (
                    <CustomSection
                        id="titles"
                        label="Titles & caption"
                        open={openSection}
                        setOpen={setOpenSection}
                    >
                        <div className="custom-row">
                            <label>Figure number</label>
                            <input
                                className="custom-input"
                                value={figureNumber}
                                onChange={(e) => {
                                    setFigureNumber(e.target.value);
                                    setEyebrow(`Figure ${e.target.value}`);
                                }}
                            />
                        </div>
                        <div className="custom-row">
                            <label>Eyebrow</label>
                            <input
                                className="custom-input"
                                value={eyebrow}
                                onChange={(e) => setEyebrow(e.target.value)}
                            />
                        </div>
                        {!useSpecFigure ? (
                            <div className="custom-row">
                                <label>Figure title</label>
                                <textarea
                                    className="custom-input"
                                    rows={2}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                        ) : null}
                        <div className="custom-row">
                            <label>Caption / methods</label>
                            <textarea
                                className="custom-input"
                                rows={3}
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                            />
                        </div>
                    </CustomSection>
                    ) : null}

                    {!useSpecFigure ? (
                        <CustomSection
                            id="axes"
                            label="Axes"
                            open={openSection}
                            setOpen={setOpenSection}
                        >
                            <div className="custom-row">
                                <label>X-axis label</label>
                                <input
                                    className="custom-input"
                                    value={xLabel}
                                    onChange={(e) => setXLabel(e.target.value)}
                                />
                            </div>
                            <div className="custom-row">
                                <label>Y-axis label</label>
                                <input
                                    className="custom-input"
                                    value={yLabel}
                                    onChange={(e) => setYLabel(e.target.value)}
                                />
                            </div>
                            <div className="custom-row">
                                <label className="custom-toggle">
                                    <input
                                        type="checkbox"
                                        checked={showGrid}
                                        onChange={(e) => setShowGrid(e.target.checked)}
                                    />
                                    <span>Show gridlines</span>
                                </label>
                            </div>
                        </CustomSection>
                    ) : null}

                    {!useSpecFigure && (supportsTwoSeriesLegend(slug) || supportsKMOverlays(slug)) ? (
                        <CustomSection
                            id="legend"
                            label="Legend & overlays"
                            open={openSection}
                            setOpen={setOpenSection}
                        >
                            {supportsTwoSeriesLegend(slug) && (
                                <>
                                    <div className="custom-row">
                                        <label>Series A label</label>
                                        <input
                                            className="custom-input"
                                            value={legendA}
                                            onChange={(e) => setLegendA(e.target.value)}
                                        />
                                    </div>
                                    <div className="custom-row">
                                        <label>Series B label</label>
                                        <input
                                            className="custom-input"
                                            value={legendB}
                                            onChange={(e) => setLegendB(e.target.value)}
                                        />
                                    </div>
                                    <div className="custom-row">
                                        <label className="custom-toggle">
                                            <input
                                                type="checkbox"
                                                checked={showLegend}
                                                onChange={(e) => setShowLegend(e.target.checked)}
                                            />
                                            <span>Show legend</span>
                                        </label>
                                    </div>
                                </>
                            )}
                            {supportsKMOverlays(slug) && (
                                <>
                                    <div className="custom-row">
                                        <label className="custom-toggle">
                                            <input
                                                type="checkbox"
                                                checked={showStats}
                                                onChange={(e) => setShowStats(e.target.checked)}
                                            />
                                            <span>Show HR &amp; log-rank annotation</span>
                                        </label>
                                    </div>
                                    <div className="custom-row">
                                        <label className="custom-toggle">
                                            <input
                                                type="checkbox"
                                                checked={showAtRisk}
                                                onChange={(e) => setShowAtRisk(e.target.checked)}
                                            />
                                            <span>Show at-risk table</span>
                                        </label>
                                    </div>
                                </>
                            )}
                        </CustomSection>
                    ) : null}

                    {!useSpecFigure && supportsErrorBars(slug) ? (
                        <CustomSection
                            id="errorBars"
                            label="Error bars"
                            open={openSection}
                            setOpen={setOpenSection}
                        >
                            <div className="custom-row">
                                <label>Magnitude</label>
                                <div className="errorbar-options">
                                    {(["sd", "sem", "ci95"] as const).map((kind) => (
                                        <button
                                            key={kind}
                                            type="button"
                                            className={
                                                "errorbar-option " +
                                                (errorBarType === kind ? "is-active" : "")
                                            }
                                            onClick={() => setErrorBarType(kind)}
                                        >
                                            {kind === "sd"
                                                ? "SD"
                                                : kind === "sem"
                                                    ? "SEM"
                                                    : "95% CI"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="custom-helper muted">
                                Error caps reflect within-group {errorBarType === "ci95" ? "95% CI" : errorBarType.toUpperCase()}. The receipt records the choice.
                            </p>
                        </CustomSection>
                    ) : null}

                    {!useSpecFigure && supportsAnnotations(slug) ? (
                        <CustomSection
                            id="annotations"
                            label="Annotations"
                            open={openSection}
                            setOpen={setOpenSection}
                        >
                            <p className="custom-helper muted">
                                Add significance brackets or p-value labels above groups.
                            </p>
                            <div className="annot-list">
                                {annotations.length === 0 && (
                                    <div className="annot-empty muted">No annotations yet.</div>
                                )}
                                {annotations.map((a, i) => (
                                    <div key={i} className="annot-row">
                                        <span className="annot-row-meta mono">
                                            {a.kind === "bracket"
                                                ? `${a.from} → ${a.to} · ${a.label}${a.pValue !== undefined ? ` · p=${a.pValue}` : ""}`
                                                : `g${a.target} · p=${a.pValue}`}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn--quiet btn--sm"
                                            onClick={() => onRemoveAnnotation(i)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="annot-form">
                                <div className="custom-row">
                                    <label>Type</label>
                                    <div className="errorbar-options">
                                        <button
                                            type="button"
                                            className={
                                                "errorbar-option " +
                                                (annotationDraft.kind === "bracket" ? "is-active" : "")
                                            }
                                            onClick={() =>
                                                setAnnotationDraft({ ...annotationDraft, kind: "bracket" })
                                            }
                                        >
                                            Bracket
                                        </button>
                                        <button
                                            type="button"
                                            className={
                                                "errorbar-option " +
                                                (annotationDraft.kind === "pLabel" ? "is-active" : "")
                                            }
                                            onClick={() =>
                                                setAnnotationDraft({ ...annotationDraft, kind: "pLabel" })
                                            }
                                        >
                                            p-label
                                        </button>
                                    </div>
                                </div>

                                {annotationDraft.kind === "bracket" && (
                                    <>
                                        <div className="custom-row custom-row--inline">
                                            <label>From group</label>
                                            <select
                                                className="map-role"
                                                value={annotationDraft.from}
                                                onChange={(e) =>
                                                    setAnnotationDraft({
                                                        ...annotationDraft,
                                                        from: parseInt(e.target.value, 10),
                                                    })
                                                }
                                            >
                                                {Array.from({ length: annotationGroupCount }).map((_, i) => (
                                                    <option key={i} value={i}>
                                                        g{i}
                                                    </option>
                                                ))}
                                            </select>
                                            <label>To group</label>
                                            <select
                                                className="map-role"
                                                value={annotationDraft.to}
                                                onChange={(e) =>
                                                    setAnnotationDraft({
                                                        ...annotationDraft,
                                                        to: parseInt(e.target.value, 10),
                                                    })
                                                }
                                            >
                                                {Array.from({ length: annotationGroupCount }).map((_, i) => (
                                                    <option key={i} value={i}>
                                                        g{i}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="custom-row custom-row--inline">
                                            <label>Label</label>
                                            <select
                                                className="map-role"
                                                value={annotationDraft.label}
                                                onChange={(e) =>
                                                    setAnnotationDraft({
                                                        ...annotationDraft,
                                                        label: e.target.value as AnnotationDraft["label"],
                                                    })
                                                }
                                            >
                                                <option value="*">*</option>
                                                <option value="**">**</option>
                                                <option value="***">***</option>
                                                <option value="ns">ns</option>
                                            </select>
                                            <label>p (optional)</label>
                                            <input
                                                className="custom-input"
                                                placeholder="0.024"
                                                value={annotationDraft.pValue}
                                                onChange={(e) =>
                                                    setAnnotationDraft({
                                                        ...annotationDraft,
                                                        pValue: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                                {annotationDraft.kind === "pLabel" && (
                                    <div className="custom-row custom-row--inline">
                                        <label>Group</label>
                                        <select
                                            className="map-role"
                                            value={annotationDraft.target}
                                            onChange={(e) =>
                                                setAnnotationDraft({
                                                    ...annotationDraft,
                                                    target: parseInt(e.target.value, 10),
                                                })
                                            }
                                        >
                                            {Array.from({ length: annotationGroupCount }).map((_, i) => (
                                                <option key={i} value={i}>
                                                    g{i}
                                                </option>
                                            ))}
                                        </select>
                                        <label>p</label>
                                        <input
                                            className="custom-input"
                                            placeholder="0.024"
                                            value={annotationDraft.pValue}
                                            onChange={(e) =>
                                                setAnnotationDraft({
                                                    ...annotationDraft,
                                                    pValue: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm annot-add"
                                    onClick={onAddAnnotation}
                                >
                                    Add annotation
                                </button>
                            </div>
                        </CustomSection>
                    ) : null}

                    {!useSpecFigure ? (
                        <button
                            type="button"
                            className="btn btn--quiet btn--sm customize-reset"
                            onClick={onReset}
                        >
                            Reset to defaults
                        </button>
                    ) : null}
                </div>
            </div>

            {!mobileRailOpen && (
                <button
                    type="button"
                    className="customize-mobile-toggle"
                    aria-expanded={mobileRailOpen}
                    aria-controls="customize-sheet"
                    onClick={openMobileRail}
                >
                    <span className="customize-mobile-toggle-icon" aria-hidden="true" />
                    Customize
                </button>
            )}

            {mobileRailOpen && (
                <div
                    className="customize-sheet-scrim"
                    onClick={() => setMobileRailOpen(false)}
                    aria-hidden="true"
                />
            )}

            <ExportChatLauncher open={chatOpen} onOpen={openChat} />
            <ExportChatPanel
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                applyPatch={applyPatch}
                appendRevision={appendRevision}
                openRailSection={onOpenRailSection}
            />
        </div>
    );
};
