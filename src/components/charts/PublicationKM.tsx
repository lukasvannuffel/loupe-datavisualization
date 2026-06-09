type PublicationKMProps = {
    animated?: boolean;
    colorA?: string;
    colorB?: string;
    dashB?: boolean;
    xLabel?: string;
    yLabel?: string;
    legendA?: string;
    legendB?: string;
    showLegend?: boolean;
    showAtRisk?: boolean;
    showStats?: boolean;
    showGrid?: boolean;
    strokeWeight?: number;
};

const STEP_A = "M50 70 H100 V82 H160 V96 H230 V108 H310 V118 H380 V128 H450 V134 H520 V140 H580";
const STEP_B = "M50 70 H90 V92 H140 V112 H200 V134 H260 V156 H320 V174 H380 V190 H440 V204 H500 V218 H580";

const CENSOR_TICKS: readonly [number, number][] = [
    [100, 82],
    [230, 108],
    [380, 128],
    [520, 140],
];

const X_TICKS: readonly number[] = [0, 12, 24, 36, 48, 60];
const Y_TICKS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

const AT_RISK_A: readonly number[] = [312, 268, 219, 178, 142, 96];
const AT_RISK_B: readonly number[] = [298, 244, 190, 148, 112, 74];

export const PublicationKM = ({
    animated = true,
    colorA = "var(--ink)",
    colorB = "var(--gray)",
    dashB = true,
    xLabel = "MONTHS SINCE RANDOMIZATION",
    yLabel = "SURVIVAL PROBABILITY",
    legendA = "Treatment A — n=312",
    legendB = "Treatment B — n=298",
    showLegend = true,
    showAtRisk = true,
    showStats = true,
    showGrid = false,
    strokeWeight = 1.5,
}: PublicationKMProps): JSX.Element => (
    <svg viewBox="0 0 620 360" className="rec-chart-svg">
        {showGrid &&
            [0.25, 0.5, 0.75, 1].map((v, i) => {
                const y = 280 - v * 240;

                return (
                    <line
                        key={`g${i}`}
                        x1="50"
                        x2="600"
                        y1={y}
                        y2={y}
                        stroke="var(--hairline)"
                        strokeWidth="0.6"
                    />
                );
            })}

        <line x1="50" y1="280" x2="600" y2="280" stroke="var(--ink)" strokeWidth="0.8" />
        <line x1="50" y1="40" x2="50" y2="280" stroke="var(--ink)" strokeWidth="0.8" />

        {Y_TICKS.map((v, i) => {
            const y = 280 - v * 240;

            return (
                <g key={i}>
                    <line x1="46" x2="50" y1={y} y2={y} stroke="var(--ink)" strokeWidth="0.6" />
                    <text
                        x="42"
                        y={y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        {v.toFixed(2)}
                    </text>
                </g>
            );
        })}

        {X_TICKS.map((v, i) => {
            const x = 50 + (v / 60) * 550;

            return (
                <g key={i}>
                    <line x1={x} x2={x} y1="280" y2="284" stroke="var(--ink)" strokeWidth="0.6" />
                    <text
                        x={x}
                        y="298"
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        {v}
                    </text>
                </g>
            );
        })}

        {xLabel && (
            <text
                x="325"
                y="320"
                textAnchor="middle"
                fontSize="11"
                fontFamily="Inter"
                fill="var(--ink)"
                letterSpacing="0.06em"
                className="rec-axis-edit"
            >
                {xLabel}
            </text>
        )}
        {yLabel && (
            <text
                x="14"
                y="160"
                textAnchor="middle"
                fontSize="11"
                fontFamily="Inter"
                fill="var(--ink)"
                letterSpacing="0.06em"
                transform="rotate(-90 14 160)"
                className="rec-axis-edit"
            >
                {yLabel}
            </text>
        )}

        <path
            d={STEP_A}
            fill="none"
            stroke={colorA}
            strokeWidth={strokeWeight}
            pathLength="100"
            style={{
                strokeDasharray: 100,
                strokeDashoffset: animated ? 0 : 100,
                transition: "stroke-dashoffset 1100ms cubic-bezier(0.22,0.61,0.36,1) 200ms",
                animation: animated ? "draw 1100ms cubic-bezier(0.22,0.61,0.36,1) 200ms both" : "none",
            }}
        />
        <path
            d={STEP_B}
            fill="none"
            stroke={colorB}
            strokeWidth={strokeWeight}
            strokeDasharray={dashB ? "3 2" : undefined}
        />

        {CENSOR_TICKS.map(([x, y], i) => (
            <line key={i} x1={x} y1={y - 5} x2={x} y2={y + 5} stroke={colorA} strokeWidth="0.8" />
        ))}

        {showLegend && (
            <g>
                <line x1="430" y1="62" x2="450" y2="62" stroke={colorA} strokeWidth={strokeWeight} />
                <text x="456" y="65" fontSize="11" fontFamily="Inter" fill="var(--ink)">
                    {legendA}
                </text>
                <line
                    x1="430"
                    y1="82"
                    x2="450"
                    y2="82"
                    stroke={colorB}
                    strokeWidth={strokeWeight}
                    strokeDasharray={dashB ? "3 2" : undefined}
                />
                <text x="456" y="85" fontSize="11" fontFamily="Inter" fill="var(--ink)">
                    {legendB}
                </text>
            </g>
        )}

        {showAtRisk && (
            <g transform="translate(0, 332)">
                <text
                    x="50"
                    y="0"
                    fontSize="9.5"
                    fontFamily="Inter"
                    fill="var(--gray)"
                    letterSpacing="0.1em"
                >
                    AT RISK
                </text>
                {X_TICKS.map((m, i) => {
                    const x = 50 + (m / 60) * 550;

                    return (
                        <g key={i}>
                            <text
                                x={x}
                                y="14"
                                textAnchor="middle"
                                fontSize="9.5"
                                fontFamily="Inter"
                                fill={colorA}
                            >
                                {AT_RISK_A[i]}
                            </text>
                            <text
                                x={x}
                                y="26"
                                textAnchor="middle"
                                fontSize="9.5"
                                fontFamily="Inter"
                                fill={colorB}
                            >
                                {AT_RISK_B[i]}
                            </text>
                        </g>
                    );
                })}
            </g>
        )}
    </svg>
);
