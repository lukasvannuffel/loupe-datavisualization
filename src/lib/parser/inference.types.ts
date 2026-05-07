/** Mutually-exclusive base type for a column. Decides how values can be charted (numbers, dates, labels). */
export type PrimaryType =
    | "numeric"
    | "integer"
    | "categorical"
    | "binary"
    | "date"
    | "datetime";

/** Optional medical-domain layer on top of a primaryType (e.g. a numeric column that is also time-to-event). */
export type SemanticTag = "time-to-event" | "event-status" | "patient-id";

/** Result of one detector run: did it match, with what confidence, and which rules fired (for UI tooltips). */
export type DetectorResult = {
    readonly matches: boolean;
    readonly confidence: number;
    readonly reasons: readonly string[];
};

/** Schema-only inference for a single column. Holds at most 5 sample values; never references row arrays. */
export type ColumnInference = {
    readonly name: string;
    readonly primaryType: PrimaryType;
    readonly semanticTag?: SemanticTag;
    readonly confidence: number;
    readonly reasons: readonly string[];
    readonly nullCount: number;
    readonly uniqueCount: number;
    readonly sampleValues: readonly string[];
};
