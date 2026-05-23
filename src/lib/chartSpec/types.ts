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

/** Box plot configuration: outliers, mean marker, group ordering. */
export type BoxSpec = BaseSpec & {
    readonly kind: "box";
    readonly showOutliers: boolean;
    readonly showMeanMarker: boolean;
    readonly groupOrder: "alphabetical" | "byMedian" | "manual";
};

/** XY plot: scatter, line, or combined; regression and correlation toggles. */
export type XYSpec = BaseSpec & {
    readonly kind: "xy";
    readonly mode: "scatter" | "line" | "scatterLine";
    readonly showRegression: boolean;
    readonly regressionType?: "linear" | "loess";
    readonly showCorrelation: boolean;
};

/** Discriminated visual configuration for any V1 chart. Renderer dispatches on `kind`. */
export type ChartSpec = KMSpec | BarErrorSpec | BoxSpec | XYSpec;

export type { AtRiskTick, KMGroup, KMPlotData, KMPoint } from "./aggregators/kaplanMeier.types";
export { KaplanMeierError } from "./aggregators/kaplanMeier.types";

/** Per-group summary statistics for bar-with-error charts. Error magnitude is derived at render time. */
export type BarErrorGroupStats = {
    readonly label: string;
    readonly mean: number;
    readonly sd: number;
    readonly n: number;
};

/** Bar-with-error aggregates: per-group means and spread inputs. No per-patient rows. */
export type BarErrorPlotData = {
    kind: "barError";
    groups: readonly BarErrorGroupStats[];
};

/** One aggregated box-and-whisker group: five-number summary, optional mean, outlier values, and sample size. */
export type BoxGroup = {
    label: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: readonly number[];
    mean?: number;
    n: number;
};

/** Box plot aggregates: per-group summaries. No per-patient rows. */
export type BoxPlotData = {
    kind: "box";
    groups: readonly BoxGroup[];
};

/** One XY observation (aggregated point). */
export type XYPoint = {
    x: number;
    y: number;
};

/** One XY series: label and points only (regression lives on `XYPlotData` when precomputed). */
export type XYSeries = {
    label: string;
    points: readonly XYPoint[];
};

/** XY aggregates: one or more series; optional global regression line and correlation. No per-patient rows. */
export type XYPlotData = {
    kind: "xy";
    series: readonly XYSeries[];
    regression?: {
        slope: number;
        intercept: number;
    };
    correlation?: number;
};

/** Discriminated chart-input data. Every variant is aggregated; per-patient fields are forbidden. */
export type PlotData =
    | import("./aggregators/kaplanMeier.types").KMPlotData
    | BarErrorPlotData
    | BoxPlotData
    | XYPlotData;

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

/** Append-only user override of the AI-recommended chart kind. */
export type OverrideEvent = {
    readonly from: ChartSpec["kind"];
    readonly to: ChartSpec["kind"];
    readonly at: string;
    readonly reason?: string;
};

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
    readonly overrides: ReadonlyArray<OverrideEvent>;
};
