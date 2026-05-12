/** All chart types Loupe knows about. Renderer dispatches on this; only the four `SpecKind` values have full Specs in V1. */
export type ChartSlug =
    | "km"
    | "forest"
    | "box"
    | "roc"
    | "volcano"
    | "bland"
    | "violin"
    | "funnel"
    | "spaghetti"
    | "barError"
    | "dot"
    | "groupedBar"
    | "bar"
    | "barHorizontal"
    | "stackedBar"
    | "stackedBar100"
    | "line"
    | "scatter"
    | "xy"
    | "histogram"
    | "pie"
    | "donut"
    | "lollipop"
    | "pairedPlot"
    | "sankey"
    | "sunburst";

/** Significance bracket or p-label drawn over a chart at fixed category indices. */
export type StatAnnotation =
    | {
          kind: "bracket";
          from: number;
          to: number;
          label: "*" | "**" | "***" | "ns";
          pValue?: number;
          level: number;
      }
    | {
          kind: "pLabel";
          target: number;
          pValue: number;
      };

/** Discriminator subset: the four chart types V1 ships with full Spec + PlotData. */
export type SpecKind = Extract<ChartSlug, "km" | "barError" | "box" | "xy">;

/** Frame, typography, palette and stroke options shared by every Spec. */
export type BaseSpec = {
    version: 1;
    id: string;
    createdAt: string;
    title: string;
    caption?: string;
    xLabel?: string;
    yLabel?: string;
    showLegend: boolean;
    showGrid: boolean;
    paletteId: string;
    strokeWeight: number;
};

/** Survival curve (Kaplan–Meier) configuration: legends, censoring tick, at-risk table, time unit. */
export type KMSpec = BaseSpec & {
    kind: "km";
    legendA: string;
    legendB?: string;
    dashB: boolean;
    showAtRisk: boolean;
    showStats: boolean;
    timeUnit: "days" | "weeks" | "months" | "years";
};

/** Categorical means with uncertainty: error-bar family + optional significance annotations. */
export type BarErrorSpec = BaseSpec & {
    kind: "barError";
    errorBarType: "sd" | "sem" | "ci95";
    annotations: readonly StatAnnotation[];
};

/** Box plot configuration: outliers, mean diamond, notched boxes. */
export type BoxSpec = BaseSpec & {
    kind: "box";
    showOutliers: boolean;
    showMeanMarker: boolean;
    notched: boolean;
};

/** XY plot (line / scatter / both): regression overlay and error bands. */
export type XYSpec = BaseSpec & {
    kind: "xy";
    mode: "line" | "scatter" | "both";
    showRegression: boolean;
    showErrorBands: boolean;
};

/** Discriminated visual configuration for any V1 chart. Renderer dispatches on `kind`. */
export type ChartSpec = KMSpec | BarErrorSpec | BoxSpec | XYSpec;

/** Single step on a Kaplan–Meier curve at one event/censoring time. Aggregated, never per-patient. */
export type KMPoint = {
    time: number;
    survival: number;
    atRisk: number;
    censored: number;
};

/** Pointwise confidence band around a KM curve at a given time. */
export type KMConfidenceInterval = {
    time: number;
    lower: number;
    upper: number;
};

/** One survival curve: label + step points + optional median + optional CI band. No raw rows. */
export type KMGroup = {
    label: string;
    points: readonly KMPoint[];
    median?: number;
    ci?: readonly KMConfidenceInterval[];
};

/** Survival aggregates ready to render: per-group step points + at-risk counts. No per-patient rows. */
export type KMPlotData = {
    kind: "km";
    groups: readonly KMGroup[];
};

/** One bar: category mean, sample size, and a single error magnitude (SD/SEM/CI half-width). */
export type BarErrorCategory = {
    label: string;
    mean: number;
    error: number;
    n: number;
};

/** Bar-with-error aggregates: per-category summary statistics. No per-patient rows. */
export type BarErrorPlotData = {
    kind: "barError";
    categories: readonly BarErrorCategory[];
};

/** One aggregated box-and-whisker group: five-number summary, optional outlier values, and sample size. */
export type BoxGroup = {
    label: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: readonly number[];
    n: number;
};

/** Box plot aggregates: per-group summaries. No per-patient rows. */
export type BoxPlotData = {
    kind: "box";
    groups: readonly BoxGroup[];
};

/** One XY observation (aggregated point); optional asymmetric error band bounds. */
export type XYPoint = {
    x: number;
    y: number;
    errorLow?: number;
    errorHigh?: number;
};

/** One XY series: label, points, optional precomputed regression coefficients. */
export type XYSeries = {
    label: string;
    points: readonly XYPoint[];
    regression?: {
        slope: number;
        intercept: number;
        r2: number;
    };
};

/** XY aggregates: one or more series (line and/or scatter). No per-patient rows. */
export type XYPlotData = {
    kind: "xy";
    series: readonly XYSeries[];
};

/** Discriminated chart-input data. Every variant is aggregated; per-patient fields are forbidden. */
export type PlotData = KMPlotData | BarErrorPlotData | BoxPlotData | XYPlotData;

/** Headline + reasoning shown to the user when a chart type is recommended. */
export type RecommendationBlock = {
    chartName: string;
    headline: string;
    becauseTitle: string;
    because: string;
    handlesTitle: string;
    handles: string;
};

/** Considered-but-not-chosen alternative with its slug and the reason it was set aside. */
export type AlternativeBlock = {
    slug: ChartSlug;
    name: string;
    reason: string;
};

/** Plain-language description of one data transformation applied prior to rendering. */
export type TransformationBlock = {
    verb: string;
    chart: string;
};

/** One statistical test result. `label` covers V1; structured fields support V2 (log-rank, Cox) without breaking. */
export type StatTest = {
    label: string;
    name?: string;
    pValue?: number;
    statistic?: number;
    ci95?: readonly [number, number];
    notes?: string;
};

/**
 * How the user arrived at the chosen chart type:
 * - `ai` — the chart was suggested by the AI recommender.
 * - `manual` — the user picked the chart type themselves (no AI request was made).
 */
export type SelectionMode = "ai" | "manual";

/** Exact, immutable receipt note appended whenever the user picks the chart manually. */
export const MANUAL_SELECTION_NOTE =
    "User selected chart type manually (no AI recommendation requested)" as const;

/**
 * Returns the canonical manual-selection note for `manual` mode, and `undefined`
 * for `ai`. Use this when composing a `Receipt` so the invariant enforced by
 * `receiptSchema` is always upheld at the type level.
 */
export const manualSelectionNoteFor = (
    mode: SelectionMode,
): typeof MANUAL_SELECTION_NOTE | undefined =>
    mode === "manual" ? MANUAL_SELECTION_NOTE : undefined;

/**
 * Reproducibility record bound to a chart: how it was selected, the intent that
 * drove it, recommendation copy, alternatives, transformations, and tests.
 *
 * `selectionMode` is required (additive but non-breaking — every receipt now
 * carries provenance). When `selectionMode === 'manual'`, `manualSelectionNote`
 * is populated with the exact `MANUAL_SELECTION_NOTE` string; for `ai` it is
 * intentionally omitted.
 */
export type Receipt = {
    intent: string;
    selectionMode: SelectionMode;
    manualSelectionNote?: typeof MANUAL_SELECTION_NOTE;
    recommendation: RecommendationBlock;
    alternatives: readonly AlternativeBlock[];
    transformations: readonly TransformationBlock[];
    testsTitle: string;
    tests: readonly StatTest[];
};
