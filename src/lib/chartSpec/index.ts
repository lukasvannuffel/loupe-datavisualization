export type {
    AlternativeBlock,
    AtRiskTick,
    BarErrorGroupStats,
    BarErrorPlotData,
    BarErrorSpec,
    BaseSpec,
    BoxPlotData,
    BoxStats,
    BoxSpec,
    ChartSlug,
    ChartSpec,
    KMGroup,
    KMPlotData,
    KMPoint,
    KMSpec,
    OverrideEvent,
    PlotData,
    Receipt,
    RecommendationBlock,
    SelectionMode,
    SpecKind,
    StatAnnotation,
    StatTest,
    TransformationBlock,
    LabeledRegression,
    LongitudinalData,
    LongitudinalGroup,
    LongitudinalPoint,
    RegressionResult,
    XYGroup,
    XYPlotData,
    XYPoint,
    XYSpec,
} from "./types";
export {
    BoxPlotError,
    KaplanMeierError,
    LongitudinalError,
    MANUAL_SELECTION_NOTE,
    manualSelectionNoteFor,
    XYPlotError,
} from "./types";
export { chartSpecSchema, plotDataSchema, receiptSchema } from "./schemas";
export { createDefaultChartSpec, defaultBarErrorSpec } from "./factory";
export { aggregateBarError } from "./aggregators/barError";
export { aggregateBoxPlot } from "./aggregators/boxPlot";
export { aggregateKaplanMeier } from "./aggregators/kaplanMeier";
export { aggregateLongitudinal } from "./aggregators/longitudinalAggregator";
export { aggregateXYPlot } from "./aggregators/xyPlot";
export { computeLinearRegression } from "./aggregators/linearRegression";
export type {
    BarErrorAggregation,
    ErrorBarType,
    GroupStats,
    MissingDataInfo,
} from "./aggregators/barError.types";
export { computeErrorBar, inferErrorTypeFromReceipt } from "./aggregators/errorBars";
