import type { ScaleLinear } from "d3-scale";

import { nAtRiskAtTime } from "@/lib/chartSpec/aggregators/nAtRiskAtTime";
import type { KMGroup } from "@/lib/chartSpec/aggregators/kaplanMeier.types";

type Props = {
    readonly groups: readonly KMGroup[];
    readonly tickCount: number;
    readonly xScale: ScaleLinear<number, number>;
    readonly innerWidth: number;
    readonly marginLeft: number;
};

export const AtRiskTable = ({
    groups,
    tickCount,
    xScale,
    innerWidth,
    marginLeft,
}: Props): JSX.Element | null => {
    if (groups.length === 0) {
        return null;
    }

    const tickTimes = xScale.ticks(tickCount);

    return (
        <div className="km-at-risk-wrap" style={{ overflowX: "auto", width: "100%" }}>
            <table
                aria-label="Number at risk per group over time"
                className="km-at-risk-table mono"
                style={{
                    borderCollapse: "collapse",
                    fontSize: 11,
                    marginLeft,
                    tableLayout: "fixed",
                    width: innerWidth,
                }}
            >
                <caption
                    className="km-at-risk-caption muted"
                    style={{
                        captionSide: "top",
                        letterSpacing: "0.1em",
                        marginBottom: 6,
                        textAlign: "left",
                    }}
                >
                    AT RISK
                </caption>
                <thead>
                    <tr>
                        <th scope="col" style={{ textAlign: "left", width: 72 }} />
                        {tickTimes.map((t) => (
                            <th key={t} scope="col" style={{ fontWeight: 400, textAlign: "center" }}>
                                {t}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {groups.map((group) => (
                        <tr key={group.label}>
                            <th scope="row" style={{ fontWeight: 400, textAlign: "left" }}>
                                {group.label}
                            </th>
                            {tickTimes.map((t) => (
                                <td
                                    key={`${group.label}-${t}`}
                                    data-testid={`at-risk-${group.label}-${t}`}
                                    style={{ textAlign: "center" }}
                                >
                                    {nAtRiskAtTime(group, t)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
