"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
    getPublicationChart,
    type ChartSlug,
} from "@/components/charts/chartPreviews";
import type {
    PublicationChartProps,
    StatAnnotation,
} from "@/components/charts/types";
import { PALETTE_SWATCH_HEX, resolvePalette } from "@/components/charts/d3/palettes";
import type { PaletteName } from "@/lib/chartSpec/types";
import { SpecChartPanel } from "@/components/charts/SpecChartPanel";
import { CustomizationRail } from "@/components/customization/CustomizationRail";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState } from "@/app/providers";
import { mappingForBarError } from "@/components/pages/recommendation/barErrorMapping";
import { aggregateBarError } from "@/lib/chartSpec/aggregators/barError";
import { aggregateBoxPlot } from "@/lib/chartSpec/aggregators/boxPlot";
import { BoxPlotError } from "@/lib/chartSpec/aggregators/boxPlot.types";
import { aggregateKaplanMeier } from "@/lib/chartSpec/aggregators/kaplanMeier";
import type { KMPlotData } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import { KaplanMeierError } from "@/lib/chartSpec/aggregators/kaplanMeier.types";
import { aggregateLongitudinal } from "@/lib/chartSpec/aggregators/longitudinalAggregator";
import { aggregateXYPlot } from "@/lib/chartSpec/aggregators/xyPlot";
import type { LongitudinalData, XYPlotData } from "@/lib/chartSpec/aggregators/xyPlot.types";
import { LongitudinalError, XYPlotError } from "@/lib/chartSpec/aggregators/xyPlot.types";
import { BarErrorChart } from "@/components/charts/d3/BarErrorChart";
import { KaplanMeierChart } from "@/components/charts/d3/KaplanMeierChart";
import { XYChart } from "@/components/charts/d3/XYChart";
import type { SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import { resolveWizardChartSpec } from "@/lib/chartSpec/resolveWizardChartSpec";
import type { BarErrorPlotData, ChartSpec, PlotData } from "@/lib/chartSpec/types";
import { ChartFrameLoader } from "@/components/charts/ChartFrameLoader";
import { saveChart } from "@/app/charts/actions";
import type { ChartRow, GetChartResult } from "@/app/charts/actions";
import { exportPng } from "@/lib/export/exportPng";
import { CHART_EXPORT_FONT, ExportError, exportSvg, exportSvgString } from "@/lib/export/exportSvg";
import { buildReceipt } from "@/lib/receipt/buildReceipt";
import { copyToClipboard } from "@/lib/receipt/copyToClipboard";
import type { ComputationSummary, ReceiptInput } from "@/lib/receipt/composeReceipt";
import type { Receipt as SaveReceipt } from "@/lib/receipt/schemas";
import { summarizeComputations } from "@/lib/receipt/summarizeComputations";
import { ReproducibilityReceiptPanel } from "@/components/pages/ReproducibilityReceiptPanel";
import { generateThumbnail } from "@/lib/thumbnail/generateThumbnail";
import { useToast } from "@/lib/toast/useToast";
import { ViewOnlyNotice } from "./ViewOnlyNotice";
import { CustomSection } from "./CustomSection";
import { ExportChatLauncher } from "./ExportChat/ExportChatLauncher";
import { ExportChatPanel } from "./ExportChat/ExportChatPanel";
import type { ChartConfig, ChatRevision, RailSection } from "./ExportChat/types";
import { SaveChartDialog } from "./Export/SaveChartDialog";
import { ExportFigureActions } from "./Export/ExportFigureActions";
import { ExportProjectActions } from "./Export/ExportProjectActions";

type LegacyPaletteId =
    | "editorial"
    | "okabe-ito"
    | "wong"
    | "ibm"
    | "tol-vibrant"
    | "deuter"
    | "mono";

type Palette = {
    readonly id: LegacyPaletteId;
    readonly name: string;
    readonly note: string;
    readonly a: string;
    readonly b: string;
};

const LEGACY_PALETTE_SWATCH_KEYS: Record<LegacyPaletteId, PaletteName> = {
    editorial: "editorial",
    "okabe-ito": "okabe-ito",
    wong: "wong",
    ibm: "ibm-design",
    "tol-vibrant": "tol-vibrant",
    deuter: "deuteranopia-tuned",
    mono: "monochrome",
};

const LEGACY_PALETTE_META: Record<
    LegacyPaletteId,
    { readonly name: string; readonly note: string }
> = {
    editorial: { name: "Editorial", note: "Default · ink + gray" },
    "okabe-ito": { name: "Okabe–Ito", note: "Colorblind-safe" },
    wong: { name: "Wong", note: "Colorblind-safe" },
    ibm: { name: "IBM Design", note: "Colorblind-safe" },
    "tol-vibrant": { name: "Tol Vibrant", note: "Colorblind-safe" },
    deuter: { name: "Deuteranopia-tuned", note: "Blue + amber" },
    mono: { name: "Monochrome", note: "Print-safe" },
};

const PALETTES: readonly Palette[] = (
    Object.keys(LEGACY_PALETTE_META) as LegacyPaletteId[]
).map((id) => {
    const swatch = PALETTE_SWATCH_HEX[LEGACY_PALETTE_SWATCH_KEYS[id]];
    const meta = LEGACY_PALETTE_META[id];

    return {
        id,
        name: meta.name,
        note: meta.note,
        a: swatch[0],
        b: swatch[1],
    };
});

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

const computePlotData = (
    spec: ChartSpec,
    mapping: ReturnType<typeof useAppState>["mapping"],
    dataset: NonNullable<ReturnType<typeof useAppState>["dataset"]>,
): PlotData | null => {
    if (spec.kind === "barError") {
        const mapped = mappingForBarError(mapping, dataset.inferences);

        return { kind: "barError", groups: aggregateBarError(dataset.rows, mapped.mapping).groups };
    }
    if (spec.kind === "km") {
        if (mapping.time === undefined || mapping.event === undefined) {
            return null;
        }
        try {
            return aggregateKaplanMeier(dataset.rows, mapping);
        } catch (error) {
            if (error instanceof KaplanMeierError) {
                return null;
            }
            throw error;
        }
    }
    if (spec.kind === "box") {
        if (mapping.outcome === undefined) {
            return null;
        }
        try {
            return aggregateBoxPlot(dataset.rows, mapping);
        } catch (error) {
            if (error instanceof BoxPlotError) {
                return null;
            }
            throw error;
        }
    }
    if (mapping.x === undefined || mapping.y === undefined) {
        return null;
    }
    try {
        const useLongitudinal = spec.mode === "line" || (spec.mode === "both" && mapping.id !== undefined);

        return useLongitudinal
            ? aggregateLongitudinal(dataset.rows, mapping)
            : aggregateXYPlot(dataset.rows, mapping, { computeRegression: spec.showRegression });
    } catch (error) {
        if (error instanceof XYPlotError || error instanceof LongitudinalError) {
            return null;
        }
        throw error;
    }
};

type ExportProps = {
    readonly initialChart?: ChartRow | null;
    readonly initialChartId?: string | null;
    readonly initialLoadReason?: Extract<GetChartResult, { readonly ok: false }>["reason"] | null;
};

export const Export = ({
    initialChart = null,
    initialChartId = null,
    initialLoadReason = null,
}: ExportProps): JSX.Element => {
    const router = useRouter();
    const { toast } = useToast();
    const {
        chartKind,
        chartSlug: appChartSlug,
        chartSpec,
        dataset,
        hydrated,
        mapping,
        receipt,
        setChartKind,
        setChartSlug,
        setChartSpec,
        setMapping,
    } = useAppState();

    const slug: ChartSlug = appChartSlug ?? "km";
    const useSpecFigure = chartSpec !== null && isSpecKind(chartSpec.kind);
    const slugDefaults = SLUG_DEFAULTS[slug];
    const ChartComponent = getPublicationChart(slug);

    const [copied, setCopied] = useState<boolean>(false);
    const [copying, setCopying] = useState<boolean>(false);

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
    const [, setChatRevisions] = useState<ChatRevision[]>([]);
    const [computationSnapshot, setComputationSnapshot] = useState<ComputationSummary | null>(null);
    const [computedReceipt, setComputedReceipt] = useState<SaveReceipt | null>(null);
    const [receiptBuilding, setReceiptBuilding] = useState<boolean>(false);
    const [receiptBuildFailed, setReceiptBuildFailed] = useState<boolean>(false);
    const [receiptBuildAttempt, setReceiptBuildAttempt] = useState<number>(0);
    const [saving, setSaving] = useState<boolean>(false);
    const [exporting, setExporting] = useState<boolean>(false);
    const [pngLoading, setPngLoading] = useState<false | 300 | 600>(false);

    const [mobileRailOpen, setMobileRailOpen] = useState<boolean>(false);
    const chartCanvasRef = useRef<HTMLDivElement | null>(null);

    const [liveSpec, setLiveSpec] = useState<ChartSpec | null>(
        () => initialChart?.chart_spec ?? chartSpec,
    );
    const [loadedChartId, setLoadedChartId] = useState<string | null>(
        () => initialChart?.id ?? initialChartId ?? null,
    );
    const [loadedChartName, setLoadedChartName] = useState<string | null>(
        () => initialChart?.name ?? null,
    );
    const [loadedChartTags, setLoadedChartTags] = useState<readonly string[]>(
        () => initialChart?.tags ?? [],
    );
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [loadedPlotData, setLoadedPlotData] = useState<PlotData | null>(
        () => initialChart?.plot_data ?? null,
    );
    const [loadedReceipt, setLoadedReceipt] = useState<SaveReceipt | null>(
        () => initialChart?.receipt ?? null,
    );
    const [viewOnlySnapshot, setViewOnlySnapshot] = useState<{ name: string; thumbnail: string | null } | null>(
        () =>
            initialChart !== null && initialChart.plot_data === null
                ? { name: initialChart.name, thumbnail: initialChart.thumbnail }
                : null,
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const exportGuardFiredRef = useRef(false);

    useEffect(() => {
        setLiveSpec(chartSpec);
    }, [chartSpec]);

    useEffect(() => {
        if (
            !hydrated ||
            initialChartId !== null ||
            initialChart !== null ||
            chartSpec !== null ||
            (chartKind !== null && dataset !== null)
        ) {
            return;
        }
        if (exportGuardFiredRef.current) {
            return;
        }
        exportGuardFiredRef.current = true;
        toast({
            variant: "warning",
            title: "No chart to export",
            description: "Complete your recommendation first.",
        });
        router.push("/recommend");
    }, [chartKind, chartSpec, dataset, hydrated, initialChart, initialChartId, router, toast]);

    useEffect(() => {
        if (initialLoadReason !== null) {
            setLoadedChartId(initialChartId);
            setLoadedChartName(null);
            setLoadedChartTags([]);
            setLoadedPlotData(null);
            setLoadedReceipt(null);
            setViewOnlySnapshot(null);

            if (initialLoadReason === "not_found") {
                setLoadError("This chart could not be found. It may have been deleted.");
            } else if (initialLoadReason === "unauthenticated") {
                setLoadError("Sign in again to open this chart.");
            } else {
                setLoadError("We couldn't load this chart. Refresh the page to try again.");
            }

            return;
        }

        if (initialChartId === null) {
            setLoadedChartId(null);
            setLoadedChartName(null);
            setLoadedChartTags([]);
            setLoadedPlotData(null);
            setLoadedReceipt(null);
            setViewOnlySnapshot(null);
            setLoadError(null);
            return;
        }
        if (initialChart === null) {
            setLoadedChartId(initialChartId);
            setLoadedChartName(null);
            setLoadedChartTags([]);
            setLoadedPlotData(null);
            setLoadedReceipt(null);
            setViewOnlySnapshot(null);
            setLoadError("This chart could not be found. It may have been deleted.");
            return;
        }
        setLoadedChartId(initialChart.id);
        setLoadedChartName(initialChart.name);
        setLoadedChartTags(initialChart.tags);
        setChartSpec(initialChart.chart_spec);
        setLiveSpec(initialChart.chart_spec);
        setChartKind(initialChart.chart_spec.kind);
        setChartSlug(initialChart.chart_spec.kind);
        setMapping(initialChart.column_mapping);
        setLoadedReceipt(initialChart.receipt);
        if (initialChart.plot_data === null) {
            setLoadedPlotData(null);
            setViewOnlySnapshot({ name: initialChart.name, thumbnail: initialChart.thumbnail });
            return;
        }
        setViewOnlySnapshot(null);
        setLoadedPlotData(initialChart.plot_data);
        setLoadError(null);
    }, [initialChart, initialChartId, initialLoadReason, setChartKind, setChartSlug, setChartSpec, setMapping]);

    useEffect(() => {
        if (
            initialChartId !== null ||
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
    }, [chartKind, chartSpec, dataset, hydrated, initialChartId, mapping, setChartSpec, setMapping]);

    const onSpecChange = (updater: SpecUpdater): void => {
        if (liveSpec === null) {
            return;
        }

        const next = updater(liveSpec);
        setLiveSpec(next);
        setChartSpec(next);
    };

    const xyErrorBandsAvailable =
        liveSpec?.kind === "xy" &&
        (liveSpec.mode === "line" || (liveSpec.mode === "both" && mapping.id !== undefined));

    const specFigureTitle =
        useSpecFigure && liveSpec !== null ? resolveChartLabels(liveSpec).title : title;

    const aiRationale =
        dataset !== null
            ? (receipt?.recommendation.because ?? slugDefaults.rationale)
            : (loadedReceipt?.ai_rationale ?? slugDefaults.rationale);

    const useLoadedFigure = loadedChartId !== null && loadedPlotData !== null;

    const exportPlotData = useMemo((): PlotData | null => {
        if (!useSpecFigure || liveSpec === null) {
            return null;
        }

        if (useLoadedFigure) {
            return loadedPlotData;
        }
        if (dataset !== null) {
            return computePlotData(liveSpec, mapping, dataset);
        }

        return loadedPlotData;
    }, [dataset, liveSpec, loadedPlotData, mapping, useLoadedFigure, useSpecFigure]);

    useEffect(() => {
        if (liveSpec === null || exportPlotData === null) {
            setComputationSnapshot(null);
            return;
        }

        setComputationSnapshot(summarizeComputations(liveSpec, exportPlotData, mapping));
    }, [exportPlotData, liveSpec, mapping]);

    const reproducibilityInput = useMemo((): ReceiptInput | null => {
        if (!useSpecFigure || liveSpec === null || computationSnapshot === null) {
            return null;
        }

        return {
            spec: liveSpec,
            aiReasoning: aiRationale,
            computations: computationSnapshot,
        };
    }, [aiRationale, computationSnapshot, liveSpec, useSpecFigure]);

    useEffect(() => {
        let isCancelled = false;

        if (!useSpecFigure || liveSpec === null || exportPlotData === null || computationSnapshot === null) {
            setComputedReceipt(null);
            setReceiptBuilding(false);
            setReceiptBuildFailed(false);
            return;
        }

        setReceiptBuilding(true);
        setReceiptBuildFailed(false);

        const nextPalette: PaletteName = resolvePalette(liveSpec);
        const nRowsInput = useLoadedFigure
            ? (loadedReceipt?.n_rows_input ?? 0)
            : dataset !== null
              ? dataset.rows.length
              : (loadedReceipt?.n_rows_input ?? 0);

        void buildReceipt({
            aiRationale,
            chartSpec: liveSpec,
            columnMapping: mapping,
            computations: computationSnapshot,
            generatedAt: computationSnapshot.computedAt,
            nRowsInput,
            palette: nextPalette,
            plotData: exportPlotData,
        })
            .then((nextReceipt) => {
                if (!isCancelled) {
                    setComputedReceipt(nextReceipt);
                    setReceiptBuilding(false);
                    setReceiptBuildFailed(false);
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setComputedReceipt(null);
                    setReceiptBuilding(false);
                    setReceiptBuildFailed(true);
                    toast({
                        description: "Try again in a moment, or refresh the page.",
                        durationMs: 0,
                        title: "Could not prepare the save receipt.",
                        variant: "error",
                    });
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [
        aiRationale,
        computationSnapshot,
        dataset,
        exportPlotData,
        liveSpec,
        loadedReceipt,
        mapping,
        receiptBuildAttempt,
        toast,
        useLoadedFigure,
        useSpecFigure,
    ]);

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
        document.body.classList.add("customize-panel-open");

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-locked");
            document.body.classList.remove("customize-panel-open");
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

    const onCopy = async (): Promise<void> => {
        const surface = chartCanvasRef.current?.querySelector<HTMLElement>(".chart-surface");

        if (surface === null || surface === undefined) {
            toast({
                description: "Wait for the chart to finish rendering, then try again.",
                title: "Copy unavailable.",
                variant: "error",
            });
            return;
        }

        setCopying(true);

        try {
            const svg = await exportSvgString(surface, specFigureTitle, {
                fontFamily: CHART_EXPORT_FONT.family,
                fontUrl: CHART_EXPORT_FONT.url,
            });
            await copyToClipboard(svg);
            setCopied(true);
            toast({
                description: "Paste the SVG into your manuscript or design tool.",
                title: "Copied to clipboard.",
                variant: "success",
            });
            window.setTimeout(() => {
                setCopied(false);
            }, 1600);
        } catch {
            toast({
                description: "Try downloading SVG instead.",
                title: "Copy failed.",
                variant: "error",
            });
        } finally {
            setCopying(false);
        }
    };

    useEffect(() => {
        const onFontWarning = (): void => {
            toast({
                description: "Your PNG was exported with system fallback fonts.",
                title: "Exported with fallback fonts.",
                variant: "warning",
            });
        };

        document.addEventListener("loupe:font-warning", onFontWarning);

        return () => {
            document.removeEventListener("loupe:font-warning", onFontWarning);
        };
    }, [toast]);

    const handlePngExport = async (dpi: 300 | 600): Promise<void> => {
        const surface = chartCanvasRef.current?.querySelector<HTMLElement>(".chart-surface");

        if (surface === null || surface === undefined) {
            toast({
                description: "Wait for the chart to finish rendering, then try again.",
                title: "Export unavailable.",
                variant: "error",
            });
            return;
        }

        setPngLoading(dpi);

        try {
            await exportPng(surface, specFigureTitle, { dpi });
        } catch (error) {
            toast({
                description: "Your chart is still here — try downloading again.",
                title: "PNG export failed.",
                variant: "error",
            });
            if (error instanceof ExportError) {
                console.error("[export] png", error.reason);
            }
        } finally {
            setPngLoading(false);
        }
    };

    const handleDownloadSvg = async (): Promise<void> => {
        const surface = chartCanvasRef.current?.querySelector<HTMLElement>(".chart-surface");

        if (surface === null || surface === undefined) {
            toast({
                description: "Wait for the chart to finish rendering, then try again.",
                title: "Export unavailable.",
                variant: "error",
            });
            return;
        }

        setExporting(true);

        try {
            await exportSvg(surface, specFigureTitle, {
                fontFamily: CHART_EXPORT_FONT.family,
                fontUrl: CHART_EXPORT_FONT.url,
            });
        } catch (error) {
            toast({
                description: "Your chart is still here — try downloading again.",
                title: "SVG export failed.",
                variant: "error",
            });
            if (error instanceof ExportError) {
                console.error("[export] svg", error.reason);
            }
        } finally {
            setExporting(false);
        }
    };

    const saveDialogDefaultName =
        loadedChartId !== null && loadedChartName !== null
            ? loadedChartName
            : (liveSpec?.title ?? "Untitled chart");

    const saveDialogDefaultTags = loadedChartId !== null ? loadedChartTags : [];

    const handleSaveToProject = (): void => {
        if (receiptBuilding) {
            toast({
                description: "Wait a moment, then try saving again.",
                title: "Still preparing your receipt.",
                variant: "info",
            });
            return;
        }

        if (receiptBuildFailed || computedReceipt === null) {
            toast({
                description: "Try again in a moment, or refresh the page.",
                durationMs: 0,
                title: "Save unavailable until the receipt is ready.",
                variant: "error",
            });
            return;
        }

        if (liveSpec === null || exportPlotData === null || computationSnapshot === null) {
            toast({
                description: "Finish mapping your columns, then return to export.",
                title: "Save unavailable.",
                variant: "error",
            });
            return;
        }

        setSaveDialogOpen(true);
    };

    const handleSaveConfirm = async (name: string, tags: readonly string[]): Promise<void> => {
        if (liveSpec === null || exportPlotData === null || computedReceipt === null) {
            return;
        }

        setSaveDialogOpen(false);
        setSaving(true);

        try {
            const chartSvg = chartCanvasRef.current?.querySelector<SVGSVGElement>("svg.rec-chart-svg") ?? null;
            const thumbnail = await generateThumbnail(liveSpec.kind, exportPlotData.kind, chartSvg);
            const result = await saveChart({
                chart_spec: liveSpec,
                column_mapping: mapping,
                id: loadedChartId ?? undefined,
                name,
                tags,
                plot_data: exportPlotData,
                receipt: computedReceipt,
                thumbnail,
            });

            if (!result.success) {
                toast({
                    description: "Check your connection and try again.",
                    durationMs: 0,
                    title: "Chart could not be saved.",
                    variant: "error",
                });
                console.error("[saveChart]", result.error);
                return;
            }

            toast({
                description: "Opening your dashboard.",
                title: "Chart saved.",
                variant: "success",
            });
            router.push("/dashboard");
        } catch (error) {
            toast({
                description: "Check your connection and try again.",
                durationMs: 0,
                title: "Chart could not be saved.",
                variant: "error",
            });
            console.error("[saveChart] unexpected", error);
        } finally {
            setSaving(false);
        }
    };

    const retryReceiptBuild = (): void => {
        setReceiptBuildAttempt((attempt) => attempt + 1);
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

    if (loadError !== null) {
        return (
            <div className="export-page page-enter">
                <div className="container">
                    <p role="alert" className="muted">
                        {loadError}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                        {initialLoadReason === "load_failed" ? (
                            <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => {
                                    router.refresh();
                                }}
                            >
                                Refresh
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="btn btn--quiet btn--sm"
                            onClick={() => router.push("/dashboard")}
                        >
                            Back to dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="export-page page-enter">
            <div className="container export-shell">
                <div className="export-main">
                    <Eyebrow>Final figure</Eyebrow>
                    <h1 className="export-title">Ready for the manuscript.</h1>

                    <div className="export-canvas" ref={chartCanvasRef}>
                        <div className="export-canvas-head">
                            <div>
                                <div className="muted export-canvas-eyebrow">{eyebrow}</div>
                                <div className="serif export-canvas-title">{specFigureTitle}</div>
                            </div>
                            <div className="muted mono export-canvas-meta">{slugDefaults.metaLine}</div>
                        </div>
                        <div className="export-figure-host">
                            <div className="export-figure">
                                {viewOnlySnapshot !== null ? (
                                    <ViewOnlyNotice
                                        chartName={viewOnlySnapshot.name}
                                        thumbnail={viewOnlySnapshot.thumbnail}
                                    />
                                ) : useSpecFigure && liveSpec !== null && useLoadedFigure ? (
                                    <ChartFrameLoader>
                                        {liveSpec.kind === "km" && loadedPlotData.kind === "km" ? (
                                            <KaplanMeierChart
                                                spec={liveSpec}
                                                data={loadedPlotData as KMPlotData}
                                                onSpecChange={onSpecChange}
                                            />
                                        ) : null}
                                        {liveSpec.kind === "barError" && loadedPlotData.kind === "barError" ? (
                                            <BarErrorChart
                                                spec={liveSpec}
                                                groups={(loadedPlotData as BarErrorPlotData).groups}
                                                onSpecChange={onSpecChange}
                                            />
                                        ) : null}
                                        {liveSpec.kind === "xy" &&
                                        (loadedPlotData.kind === "xy" || loadedPlotData.kind === "longitudinal") ? (
                                            <XYChart
                                                spec={liveSpec}
                                                data={loadedPlotData as XYPlotData | LongitudinalData}
                                                mode={liveSpec.mode}
                                                showRegression={liveSpec.showRegression}
                                                showErrorBands={liveSpec.showErrorBands}
                                                onSpecChange={onSpecChange}
                                            />
                                        ) : null}
                                    </ChartFrameLoader>
                                ) : useSpecFigure && liveSpec !== null && dataset !== null ? (
                                    <>
                                        <ChartFrameLoader>
                                            <SpecChartPanel
                                                chartKind={liveSpec.kind}
                                                dataset={dataset}
                                                mapping={mapping}
                                                spec={liveSpec}
                                                onSpecChange={onSpecChange}
                                            />
                                        </ChartFrameLoader>
                                        <p className="export-chart-hint muted small">
                                            <span className="ring ring--xs" />
                                            Click any axis label or title on the chart to edit inline.
                                        </p>
                                    </>
                                ) : (
                                    <ChartComponent {...chartProps} />
                                )}
                                {caption ? (
                                    <div className="export-caption">
                                        <span className="export-caption-num mono">Figure {figureNumber}.</span>{" "}
                                        {caption}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="export-panel">
                        <ExportFigureActions
                            copied={copied}
                            copying={copying}
                            exporting={exporting}
                            pngLoading={pngLoading}
                            onDownloadSvg={() => {
                                void handleDownloadSvg();
                            }}
                            onPngExport={(dpi) => {
                                void handlePngExport(dpi);
                            }}
                            onCopy={() => {
                                void onCopy();
                            }}
                        />

                        <hr className="export-panel-divider" />

                        <ReproducibilityReceiptPanel
                            input={reproducibilityInput}
                            variant="embedded"
                        />

                        {viewOnlySnapshot === null ? (
                            <>
                                <hr className="export-panel-divider" />
                                <ExportProjectActions
                                    onRetryReceiptBuild={retryReceiptBuild}
                                    onSave={handleSaveToProject}
                                    onStartNew={() => {
                                        router.push("/upload");
                                    }}
                                    receiptBuildFailed={receiptBuildFailed}
                                    receiptBuilding={receiptBuilding}
                                    saving={saving}
                                />
                            </>
                        ) : null}
                    </div>

                </div>

                <div
                    id="customize-sheet"
                    className={"customize-rail" + (mobileRailOpen ? " is-mobile-open" : "")}
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

                    <div className="customize-rail-body">
                    {viewOnlySnapshot === null && useSpecFigure && liveSpec !== null ? (
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
                                    className="btn btn--secondary btn--sm annot-add"
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

            <SaveChartDialog
                isOpen={saveDialogOpen}
                defaultName={saveDialogDefaultName}
                defaultTags={saveDialogDefaultTags}
                onConfirm={(name, tags) => {
                    void handleSaveConfirm(name, tags);
                }}
                onCancel={() => setSaveDialogOpen(false)}
            />

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
