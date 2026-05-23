export type KMPoint = {
    readonly t: number;
    readonly survival: number;
    readonly nAtRisk: number;
    readonly censored: boolean;
    readonly ciLower: number;
    readonly ciUpper: number;
};

export type AtRiskTick = {
    readonly t: number;
    readonly nAtRisk: number;
};

export type KMGroup = {
    readonly label: string;
    readonly points: readonly KMPoint[];
    readonly atRiskTicks: readonly AtRiskTick[];
    readonly nTotal: number;
    readonly nEvents: number;
};

export type KMPlotData = {
    readonly kind: "km";
    readonly groups: readonly KMGroup[];
    readonly tMax: number;
};

export class KaplanMeierError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "KaplanMeierError";
    }
}
