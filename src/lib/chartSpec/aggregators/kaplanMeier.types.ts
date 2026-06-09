import type { LogRankResult } from "./kmLogRank";

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
    /** Aggregator default tick selection at the standard 6-count. The chart overrides
     *  this by deriving ticks from rendered width (4 ticks <480px, 6 ticks ≥480px)
     *  and recomputing nAtRisk per tick via nAtRiskAtTime. Remains useful for direct
     *  aggregator tests and headless contexts. */
    readonly atRiskTicks: readonly AtRiskTick[];
    readonly nTotal: number;
    readonly nEvents: number;
};

export type KMPlotData = {
    readonly kind: "km";
    readonly groups: readonly KMGroup[];
    readonly tMax: number;
    readonly logRank?: LogRankResult;
};

export class KaplanMeierError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "KaplanMeierError";
    }
}
