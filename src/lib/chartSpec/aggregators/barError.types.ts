export type ErrorBarType = "sd" | "sem" | "ci95";

export type GroupStats = {
    readonly label: string;
    readonly mean: number;
    readonly sd: number;
    readonly n: number;
};

export type MissingDataInfo = {
    readonly totalRows: number;
    readonly droppedRows: number;
    readonly missingOutcomeRows: number;
    readonly missingGroupRows: number;
    readonly dropRate: number;
};

export type BarErrorAggregation = {
    readonly groups: ReadonlyArray<GroupStats>;
    readonly missing: MissingDataInfo;
};
