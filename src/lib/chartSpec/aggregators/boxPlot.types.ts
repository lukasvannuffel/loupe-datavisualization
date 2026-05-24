export type BoxStats = {
    readonly kind: "box";
    readonly label: string;
    readonly n: number;
    readonly min: number;
    readonly q1: number;
    readonly median: number;
    readonly q3: number;
    readonly max: number;
    readonly mean: number;
    readonly outliers: readonly number[];
    readonly notchLower: number;
    readonly notchUpper: number;
};

export type StripStats = {
    readonly kind: "strip";
    readonly label: string;
    readonly n: number;
    readonly values: readonly number[];
};

export type GroupStats = BoxStats | StripStats;

export type BoxPlotData = {
    readonly kind: "box";
    readonly groups: readonly GroupStats[];
    readonly yMin: number;
    readonly yMax: number;
};

export class BoxPlotError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BoxPlotError";
    }
}
