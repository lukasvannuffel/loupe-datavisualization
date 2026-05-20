export type {
    AlternativeBlock,
    BarErrorCategory,
    BarErrorPlotData,
    BarErrorSpec,
    BaseSpec,
    BoxGroup,
    BoxPlotData,
    BoxSpec,
    ChartSlug,
    ChartSpec,
    KMConfidenceInterval,
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
    XYPlotData,
    XYPoint,
    XYSeries,
    XYSpec,
} from "./types";
export { MANUAL_SELECTION_NOTE, manualSelectionNoteFor } from "./types";
export { chartSpecSchema, plotDataSchema, receiptSchema } from "./schemas";
export { createDefaultChartSpec, defaultBarErrorSpec } from "./factory";
export { mockPlotDataFromInferences } from "./mockPlotData";
