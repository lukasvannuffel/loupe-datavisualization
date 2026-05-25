export type XYPoint = {
    readonly x: number;
    readonly y: number;
};

export type XYGroup = {
    readonly label: string;
    readonly points: readonly XYPoint[];
};

export type RegressionResult = {
    readonly slope: number;
    readonly intercept: number;
    readonly r2: number;
};

export type LabeledRegression = RegressionResult & {
    readonly label: string;
};

export type XYPlotData = {
    readonly kind: "xy";
    readonly groups: readonly XYGroup[];
    readonly regressions: readonly LabeledRegression[];
    readonly regressionSkipped: boolean;
    readonly xMin: number;
    readonly xMax: number;
    readonly yMin: number;
    readonly yMax: number;
};

export type LongitudinalPoint = {
    readonly visit: number;
    readonly mean: number;
    readonly sem: number;
    readonly n: number;
};

export type LongitudinalGroup = {
    readonly label: string;
    readonly points: readonly LongitudinalPoint[];
};

export type LongitudinalData = {
    readonly kind: "longitudinal";
    readonly groups: readonly LongitudinalGroup[];
    readonly xMin: number;
    readonly xMax: number;
    readonly yMin: number;
    readonly yMax: number;
};

export class XYPlotError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "XYPlotError";
    }
}

export class LongitudinalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LongitudinalError";
    }
}
