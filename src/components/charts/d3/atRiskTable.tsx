import { ticks } from "d3-array";
import type { ScaleLinear } from "d3-scale";

import type { KMGroup } from "@/lib/chartSpec/aggregators/kaplanMeier.types";

type Props = {
    readonly groups: readonly KMGroup[];
    readonly tMax: number;
    readonly xScale: ScaleLinear<number, number>;
    readonly innerWidth: number;
    readonly marginLeft: number;
};

export const AtRiskTable = ({
    groups,
    tMax,
    xScale,
    innerWidth,
    marginLeft,
}: Props): JSX.Element | null => {
    if (groups.length === 0) {
        return null;
    }

    const tickTimes = ticks(0, tMax, 6);

    return (
        <div className="km-at-risk-wrap" style={{ overflowX: "auto", width: "100%" }}>
            <div
                className="km-at-risk-grid"
                style={{
                    marginLeft,
                    minWidth: innerWidth,
                    position: "relative",
                    width: innerWidth,
                }}
            >
                <div
                    className="km-at-risk-label mono muted"
                    style={{ fontSize: 11, letterSpacing: "0.1em", marginBottom: 6 }}
                >
                    AT RISK
                </div>
                {groups.map((group) => (
                    <div
                        key={group.label}
                        className="km-at-risk-row"
                        style={{ display: "flex", height: 22, position: "relative" }}
                    >
                        <span
                            className="km-at-risk-group mono"
                            style={{
                                fontSize: 11,
                                left: 0,
                                position: "absolute",
                                top: 2,
                                width: 72,
                            }}
                        >
                            {group.label}
                        </span>
                        {tickTimes.map((t, tickIndex) => {
                            const tick = group.atRiskTicks[tickIndex];
                            const x = xScale(t);

                            return (
                                <span
                                    key={`${group.label}-${t}`}
                                    className="km-at-risk-cell mono"
                                    data-testid={`at-risk-${group.label}-${t}`}
                                    style={{
                                        fontSize: 11,
                                        left: x,
                                        position: "absolute",
                                        textAlign: "center",
                                        transform: "translateX(-50%)",
                                        width: 32,
                                    }}
                                >
                                    {tick?.nAtRisk ?? ""}
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
