/** Role assigned to a dataset column for chart mapping (V1). */
export type ColumnRole =
    | "time"
    | "event"
    | "group"
    | "outcome"
    | "predictor"
    | "x"
    | "y"
    | "id"
    | "ignore";

export type Mapping = Partial<Record<ColumnRole, string>>;