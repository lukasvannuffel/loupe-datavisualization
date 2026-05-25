export type DeriveTitleChartKind = "barError" | "km" | "box" | "xy";

export type DeriveTitleInput = {
    readonly chartKind: DeriveTitleChartKind;
    readonly mode?: "line" | "scatter" | "both";
    readonly xLabel: string;
    readonly yLabel: string;
};

/** Chart-kind-aware figure title from resolved axis labels (LOUPE-15a). */
export const deriveTitle = (input: DeriveTitleInput): string => {
    const { chartKind, mode, xLabel, yLabel } = input;

    switch (chartKind) {
        case "barError":
        case "box":
            return `${yLabel} by ${xLabel}`;
        case "km":
            return `Survival probability over ${xLabel}`;
        case "xy": {
            if (mode === "line") {
                return `${yLabel} over ${xLabel}`;
            }

            return `${yLabel} vs ${xLabel}`;
        }
    }
};
